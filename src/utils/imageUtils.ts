// クライアント側で画像を軽量圧縮するユーティリティ (長辺1000px, JPEG品質0.7: スマホカメラ写真のメモリクラッシュを防止)
export async function compressImage(file: File, maxDimension = 1000, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    // URL.createObjectURL を優先（iPhone等の高解像度写真でもメモリ消費を抑え瞬時にロード）
    const objectUrl = typeof URL !== 'undefined' && URL.createObjectURL ? URL.createObjectURL(file) : null;
    const img = new Image();

    const cleanup = () => {
      if (objectUrl && typeof URL !== 'undefined' && URL.revokeObjectURL) {
        URL.revokeObjectURL(objectUrl);
      }
    };

    const processImage = (targetImg: HTMLImageElement) => {
      let width = targetImg.width;
      let height = targetImg.height;

      // アスペクト比を維持して長辺をmaxDimensionにリサイズ
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        cleanup();
        reject(new Error('Canvas context could not be created'));
        return;
      }

      ctx.drawImage(targetImg, 0, 0, width, height);

      // JPEG形式で軽量圧縮（約40〜70KBで鮮明さを維持）
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      cleanup();
      resolve(compressedDataUrl);
    };

    img.onload = () => {
      processImage(img);
    };

    img.onerror = () => {
      cleanup();
      // フォールバック: FileReader 経由で再試行
      const reader = new FileReader();
      reader.onload = (e) => {
        const fallbackImg = new Image();
        fallbackImg.onload = () => processImage(fallbackImg);
        fallbackImg.onerror = () => reject(new Error('Failed to load image for compression'));
        fallbackImg.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    };

    if (objectUrl) {
      img.src = objectUrl;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    }
  });
}
