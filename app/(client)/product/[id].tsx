import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Button, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useCartStore } from '../../../lib/cart-store';
import { Tables } from '../../../lib/database.types';
import { supabase } from '../../../lib/supabase';

type Producto = Tables<'Producto'>;

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const addItem = useCartStore((s) => (s as any).addItem); // asumimos que el store expone addItem
  const [producto, setProducto] = useState<Producto | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState('1');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('Producto')
        .select('*')
        .eq('id_producto', Number(id))
        .single();
      setProducto(data ?? null);
      setLoading(false);
    })();
  }, [id]);

  const handleAdd = () => {
    if (!producto) return;
    const n = Number(qty);
    const cantidad = Number.isFinite(n) && n > 0 ? n : 1;

    // Adaptar al shape que usa tu cart-store (id, nombre, precio, quantity, etc.)
    addItem?.({
      id: Number(producto.id_producto),
      nombre: producto.nombre,
      precio: (producto as any).precio_base ?? 0,
      quantity: cantidad,
      stock: (producto as any).stock_total ?? 999,
      categoria: (producto as any).categoria ?? undefined,
      ProductoImagen: (producto as any).ProductoImagen ?? [],
    });

    router.push('/(client)/cart');
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 20 }} />;
  if (!producto) return <View style={{ padding: 16 }}><Text>Producto no encontrado.</Text></View>;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
      <Text style={styles.title}>{producto.nombre}</Text>
      {!!producto.descripcion && <Text style={{ color: '#6B7280' }}>{producto.descripcion}</Text>}
      <Text style={styles.price}>$ {(producto as any).precio_base?.toLocaleString?.() ?? '0'}</Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text>Cantidad:</Text>
        <TextInput
          value={qty}
          onChangeText={setQty}
          keyboardType="numeric"
          style={styles.qty}
          placeholder="1"
        />
      </View>

      <Button title="Añadir al carrito" onPress={handleAdd} />
      <Button title="Volver" onPress={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '800' },
  price: { fontSize: 22, fontWeight: '800', marginVertical: 8 },
  qty: { height: 42, width: 80, borderColor: '#ccc', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10 },
});