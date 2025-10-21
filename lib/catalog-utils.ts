export function getCategoryName(categoria: any): string {
  if (!categoria) return 'Sin categoría';
  if (typeof categoria === 'string') return categoria;
  if (typeof categoria === 'object' && categoria.nombre) return categoria.nombre;
  return 'Sin categoría';
}

export function getImageUrl(item: any): string | undefined {
  // Igual que la web: busca ProductoImagen, luego imagenes, luego campos directos
  if (item?.ProductoImagen && Array.isArray(item.ProductoImagen) && item.ProductoImagen.length > 0) {
    const principal = item.ProductoImagen.find((img: any) => img.es_principal);
    const first = item.ProductoImagen[0];
    const selected = principal || first;
    if (selected?.url_imagen) return selected.url_imagen;
  }
  if (item?.imagenes && Array.isArray(item.imagenes) && item.imagenes.length > 0) {
    const principal = item.imagenes.find((img: any) => img.es_principal);
    const first = item.imagenes[0];
    const selected = principal || first;
    if (selected?.url_imagen) return selected.url_imagen;
  }
  const direct = item?.imagen_url || item?.imagen || item?.image || item?.url_imagen;
  if (direct && !String(direct).includes('placeholder')) return direct;
  return undefined;
}