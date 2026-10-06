import Image from "next/image";

// Icone oficial do produto (public/product-icons, colecao product-icons-v1).
export default function ProductIcon({ product, size = 44, className = "", priority = false }) {
  if (!product?.iconImage) return null;

  return (
    <span className={`product-icon ${className}`} style={{ width: size, height: size }}>
      <Image src={product.iconImage} alt="" width={size} height={size} sizes={`${size}px`} priority={priority} />
    </span>
  );
}
