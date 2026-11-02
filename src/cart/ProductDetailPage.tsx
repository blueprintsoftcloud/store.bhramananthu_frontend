import React from "react";
import { useParams } from "react-router-dom";
import BhramananthuProductDetail from "../components/BhramananthuProductDetail";

export default function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  return <BhramananthuProductDetail productId={productId} />;
}