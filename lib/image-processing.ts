/**
 * 画像前処理ユーティリティ
 * OCRの精度を向上させるための画像処理
 */

/**
 * 画像を90度回転させる（4方向試す）
 */
export async function createRotatedVersions(file: File): Promise<File[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    img.onload = async () => {
      const versions: File[] = [file]; // 元の画像

      // 90度、180度、270度回転
      for (let rotation of [90, 180, 270]) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        // 90度と270度の場合は幅と高さを入れ替え
        if (rotation === 90 || rotation === 270) {
          canvas.width = img.height;
          canvas.height = img.width;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }

        // 回転の中心を設定
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        const blob = await new Promise<Blob>((res) => {
          canvas.toBlob((b) => res(b!), 'image/png', 1.0);
        });

        const rotatedFile = new File([blob], `rotated_${rotation}_${file.name}`, {
          type: 'image/png',
        });
        versions.push(rotatedFile);
      }

      resolve(versions);
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * 超シンプルな画像前処理（解像度アップのみ）
 */
export async function preprocessImageSimple(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      // 解像度を3倍に
      const scale = 3;
      const width = img.width * scale;
      const height = img.height * scale;

      canvas.width = width;
      canvas.height = height;

      // 高品質スケーリング
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      console.log(`📐 シンプル処理: ${img.width}x${img.height} → ${width}x${height}`);

      // CanvasをBlobに変換
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'));
            return;
          }

          const processedFile = new File([blob], file.name, {
            type: 'image/png',
          });

          resolve(processedFile);
        },
        'image/png',
        1.0
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * 画像をグレースケール化してコントラストを上げる
 */
export async function preprocessImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      // 解像度を上げる（最小1500pxに）
      const minDimension = 1500;
      let width = img.width;
      let height = img.height;

      if (width < minDimension || height < minDimension) {
        const scale = minDimension / Math.min(width, height);
        width = Math.floor(width * scale);
        height = Math.floor(height * scale);
      }

      canvas.width = width;
      canvas.height = height;

      // 画像を描画
      ctx.drawImage(img, 0, 0, width, height);

      // 画像データを取得
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      // 1. グレースケール化
      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        data[i] = gray;     // R
        data[i + 1] = gray; // G
        data[i + 2] = gray; // B
      }

      // 2. コントラスト強調（二値化）
      const threshold = 128;
      for (let i = 0; i < data.length; i += 4) {
        const brightness = data[i];
        const value = brightness > threshold ? 255 : 0;
        data[i] = value;
        data[i + 1] = value;
        data[i + 2] = value;
      }

      // 処理した画像をCanvasに戻す
      ctx.putImageData(imageData, 0, 0);

      // CanvasをBlobに変換
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'));
            return;
          }

          // BlobをFileに変換
          const processedFile = new File([blob], file.name, {
            type: 'image/png',
          });

          resolve(processedFile);
        },
        'image/png',
        1.0 // 最高品質
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // 画像を読み込む
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * 適応的二値化（Otsuの手法に近い簡易版）
 */
export async function preprocessImageAdvanced(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      // 適度な解像度化（2500px - バランス重視）
      const minDimension = 2500;
      let width = img.width;
      let height = img.height;

      if (width < minDimension || height < minDimension) {
        const scale = minDimension / Math.min(width, height);
        width = Math.floor(width * scale);
        height = Math.floor(height * scale);
      }

      console.log(`📐 画像サイズ: ${img.width}x${img.height} → ${width}x${height}`);

      canvas.width = width;
      canvas.height = height;

      // 画像を描画
      ctx.drawImage(img, 0, 0, width, height);

      // 画像データを取得
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      // グレースケール化
      const grayData = new Uint8Array(width * height);
      for (let i = 0, j = 0; i < data.length; i += 4, j++) {
        grayData[j] = Math.floor(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      }

      console.log('✨ グレースケール化完了');

      // Otsuの手法で最適な閾値を計算（再計算）
      const histogram2 = new Array(256).fill(0);
      for (let i = 0; i < grayData.length; i++) {
        histogram2[grayData[i]]++;
      }
      const total = grayData.length;
      let sum = 0;
      for (let i = 0; i < 256; i++) {
        sum += i * histogram2[i];
      }

      let sumB = 0;
      let wB = 0;
      let wF = 0;
      let maxVariance = 0;
      let threshold = 0;

      for (let t = 0; t < 256; t++) {
        wB += histogram2[t];
        if (wB === 0) continue;

        wF = total - wB;
        if (wF === 0) break;

        sumB += t * histogram2[t];

        const mB = sumB / wB;
        const mF = (sum - sumB) / wF;

        const variance = wB * wF * (mB - mF) * (mB - mF);

        if (variance > maxVariance) {
          maxVariance = variance;
          threshold = t;
        }
      }

      console.log(`🎯 Otsu閾値: ${threshold}`);

      // 適応的二値化（Otsu法）
      for (let i = 0, j = 0; i < data.length; i += 4, j++) {
        const value = grayData[j] > threshold ? 255 : 0;
        data[i] = value;
        data[i + 1] = value;
        data[i + 2] = value;
      }

      console.log('✅ 二値化完了');

      // シャープ化フィルター
      const sharpenKernel = [
        0, -1, 0,
        -1, 5, -1,
        0, -1, 0
      ];

      const tempData = new Uint8ClampedArray(data);
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          let r = 0, g = 0, b = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const idx = ((y + ky) * width + (x + kx)) * 4;
              const kernelIdx = (ky + 1) * 3 + (kx + 1);
              r += tempData[idx] * sharpenKernel[kernelIdx];
              g += tempData[idx + 1] * sharpenKernel[kernelIdx];
              b += tempData[idx + 2] * sharpenKernel[kernelIdx];
            }
          }
          const idx = (y * width + x) * 4;
          data[idx] = Math.max(0, Math.min(255, r));
          data[idx + 1] = Math.max(0, Math.min(255, g));
          data[idx + 2] = Math.max(0, Math.min(255, b));
        }
      }

      // 処理した画像をCanvasに戻す
      ctx.putImageData(imageData, 0, 0);

      // CanvasをBlobに変換
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'));
            return;
          }

          const processedFile = new File([blob], file.name, {
            type: 'image/png',
          });

          resolve(processedFile);
        },
        'image/png',
        1.0
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
}
