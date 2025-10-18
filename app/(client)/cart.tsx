import React, { useMemo, useState } from 'react';
import { Alert, Button, FlatList, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useCart } from '../../providers/CartProvider';

export default function CartScreen() {
  const { items, increment, decrement, remove, clear } = useCart();
  const [loading, setLoading] = useState(false);

  const subtotal = useMemo(() => items.reduce((acc, it) => acc + it.precioUnitario * it.cantidad, 0), [items]);
  const envio = 0;
  const impuestos = 0;
  const total = subtotal + envio + impuestos;

  const handleCheckout = async () => {
    if (items.length === 0) return;

    setLoading(true);
    try {
      const { data: ses } = await supabase.auth.getSession();
      const user = ses.session?.user;
      if (!user) throw new Error('Debes iniciar sesión.');

      // obtener o crear Cliente
      let { data: cli } = await supabase.from('Cliente').select('*').eq('userId', user.id).single();
      if (!cli) {
        const { data: newCli, error: cliErr } = await supabase.from('Cliente').insert({
          userId: user.id,
          email: user.email!,
          nombre: user.user_metadata?.name ?? 'Cliente',
          apellido: '',
          acepta_marketing: false,
        }).select('*').single();
        if (cliErr) throw cliErr;
        cli = newCli;
      }

      const numeroPedido = `PED-${Date.now()}`;
      const fechaISO = new Date().toISOString();

      const { data: pedido, error: pedErr } = await supabase.from('Pedido').insert({
        clienteId: cli.id_cliente,
        numero_pedido: numeroPedido,
        subtotal,
        envio,
        impuestos,
        total,
        fecha_pedido: fechaISO,
        estado_pago: 'PENDIENTE',
        estado: 'PENDIENTE',
        nombre_comprador: `${cli.nombre} ${cli.apellido ?? ''}`.trim(),
        email_comprador: cli.email,
        telefono_comprador: cli.telefono,
      }).select('*').single();
      if (pedErr) throw pedErr;

      const rows = items.map(it => ({
        pedidoId: pedido.id_pedido,
        productoId: it.productoId,
        varianteId: it.varianteId ?? null,
        cantidad: it.cantidad,
        precio_unitario: it.precioUnitario,
        descuento: 0,
      }));

      const { error: ppErr } = await supabase.from('PedidoProducto').insert(rows);
      if (ppErr) throw ppErr;

      clear();
      Alert.alert('Pedido creado', `Tu pedido ${numeroPedido} fue generado correctamente.`);
    } catch (e: any) {
      console.error('Checkout error:', e?.message ?? e);
      Alert.alert('Error en checkout', e?.message ?? 'No se pudo completar la compra.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <FlatList
        data={items}
        keyExtractor={(it) => `${it.productoId}-${it.varianteId ?? 'na'}`}
        ListEmptyComponent={<Text>No hay productos en el carrito.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700' }}>{item.nombre}</Text>
              <Text>$ {item.precioUnitario.toLocaleString()} x {item.cantidad}</Text>
            </View>
            <View style={styles.qty}>
              <Button title="-" onPress={() => decrement(item.productoId, item.varianteId ?? null)} />
              <Text style={{ paddingHorizontal: 8 }}>{item.cantidad}</Text>
              <Button title="+" onPress={() => increment(item.productoId, item.varianteId ?? null)} />
            </View>
            <Button title="Quitar" color="#d00" onPress={() => remove(item.productoId, item.varianteId ?? null)} />
          </View>
        )}
      />
      <View style={{ gap: 6, marginTop: 12 }}>
        <Text>Subtotal: $ {subtotal.toLocaleString()}</Text>
        <Text>Total: $ {total.toLocaleString()}</Text>
        <Button title={loading ? 'Procesando...' : 'Confirmar compra'} onPress={handleCheckout} disabled={loading || items.length === 0} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF', padding: 10, borderRadius: 10, marginBottom: 8 },
  qty: { flexDirection: 'row', alignItems: 'center' },
});