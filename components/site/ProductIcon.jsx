import Image from "next/image";
import Icon from "@/components/site/Icon";

// Ícone ilustrado do produto (public/product-icons); cai no ícone de linha
// quando o produto não tem imagem própria.
export default function ProductIcon({ product, size = "md", className = "" }) {
  const image = product?.iconImage;
  const classes = ["product-icon", size === "lg" ? "product-icon-lg" : "", className];

  if (image) {
    return (
      <span className={[...classes, "product-icon-image"].filter(Boolean).join(" ")}>
        <Image src={image} alt="" width={128} height={128} unoptimized />
      </span>
    );
  }

  return (
    <span className={[...classes, `tone-${product?.category || "pacote"}`].filter(Boolean).join(" ")}>
      <Icon name={product?.icon || "bundle"} size={size === "lg" ? 30 : undefined} />
    </span>
  );
}
