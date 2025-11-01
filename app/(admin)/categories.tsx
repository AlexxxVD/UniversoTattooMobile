import { useRouter } from 'expo-router';
import { MoreVertical, PlusCircle } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';

import { Screen } from '../../components/layout/Screen';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ContextMenu } from '../../components/ui/ContextMenu';
import { HeaderBar } from '../../components/ui/HeaderBar';
import { Input } from '../../components/ui/Input';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../theme';

type Categoria = {
  id_categoria: number;
  nombre: string;
  descripcion?: string | null;
  Producto: { count: number }[];
};

export default function CategoriesScreen() {
  const router = useRouter();
  const { colors, spacing } = useTheme();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false); 

  const [items, setItems] = useState<Categoria[]>([]);
  const [q, setQ] = useState('');

  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<Categoria | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const user = data.session?.user;
        if (!user) {
          Toast.show({ type: 'error', text1: 'Iniciá sesión', text2: 'Necesitás iniciar sesión para acceder' });
          router.replace('/(auth)');
          return;
        }
        const { data: userRow, error: roleErr } = await supabase
          .from('User')
          .select('role')
          .eq('id', user.id) 
          .single(); 

        if (roleErr || userRow?.role !== 'admin') {
          Toast.show({ type: 'error', text1: 'Acceso denegado', text2: 'No tenés permisos de administrador' });
          router.replace('/(client)');
          return;
        }
        setIsAdmin(true);
      } catch (e) {
        Toast.show({ type: 'error', text1: 'Acceso denegado', text2: 'No se pudo verificar tu rol' });
        router.replace('/(client)');
      } finally {
        setCheckingAuth(false);
      }
    })();
  }, [router]);
  
  const fetchAll = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('Categoria')
        .select('*, Producto(count)')
        .order('nombre', { ascending: true });

      if (error) throw error;
      setItems((data ?? []) as any);
    } catch (e: any) {
      console.error('[admin categories] fetch error:', e?.message ?? e);
      Toast.show({ type: 'error', text1: 'No se pudieron cargar las categorías' });
    }
  }, []);

  const initialLoad = useCallback(async () => {
    setLoading(true);
    await fetchAll();
    setLoading(false);
  }, [fetchAll]);

  useEffect(() => {
    if (isAdmin && !checkingAuth) {
      initialLoad();
    }
  }, [isAdmin, checkingAuth, initialLoad]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter((c) => (c.nombre ?? '').toLowerCase().includes(term));
  }, [items, q]);

  const openCreateModal = () => {
    setEditingItem(null); 
    setName('');
    setDesc('');
    setModalVisible(true);
  };

  const openEditModal = (item: Categoria) => {
    setEditingItem(item); 
    setName(item.nombre); 
    setDesc(item.descripcion ?? '');
    setModalVisible(true);
  };

  const saveCategory = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Toast.show({ type: 'error', text1: 'Nombre requerido', text2: 'Ingresá un nombre para la categoría' });
      return;
    }
    try {
      setSaving(true);
      let error: any;
      const dataToSave = { nombre: trimmed, descripcion: desc || null };

      if (editingItem) {
        // MODO EDICIÓN (UPDATE)
        const { error: updateError } = await supabase
          .from('Categoria')
          .update(dataToSave)
          .eq('id_categoria', editingItem.id_categoria);
        error = updateError;
      } else {
        // MODO CREACIÓN (INSERT)
        const { error: insertError } = await supabase
          .from('Categoria')
          .insert(dataToSave);
        error = insertError;
      }

      if (error) {
        const msg = (error.message || '').toLowerCase();
        if (error.code === '23505' || msg.includes('duplicate') || msg.includes('unique')) {
          Toast.show({ type: 'error', text1: 'Duplicado', text2: 'Ya existe una categoría con ese nombre' });
        } else {
          Toast.show({ type: 'error', text1: 'No se pudo guardar', text2: error.message });
        }
        return;
      }

      // Éxito
      setName('');
      setDesc('');
      Toast.show({ type: 'success', text1: editingItem ? 'Categoría actualizada' : 'Categoría creada' });
      setModalVisible(false);
      setEditingItem(null);
      await fetchAll(); 
    } catch (e: any) {
      console.error('[admin categories] save error:', e?.message ?? e);
      Toast.show({ type: 'error', text1: 'No se pudo guardar la categoría' });
    } finally {
      setSaving(false);
    }
  }, [name, desc, fetchAll, editingItem]);

  const handleDelete = (item: Categoria) => {
    Alert.alert(
      '¿Estás seguro?',
      `¿Querés eliminar la categoría "${item.nombre}"? Esto no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive', 
          onPress: () => actuallyDelete(item) 
        },
      ]
    );
  };

  const actuallyDelete = async (item: Categoria) => {
    try {
      const { error } = await supabase
        .from('Categoria')
        .delete()
        .eq('id_categoria', item.id_categoria); 

      if (error) {
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('violates foreign key constraint')) {
           Toast.show({ type: 'error', text1: 'Error', text2: 'No se puede borrar, la categoría está en uso por productos.' });
        } else {
           Toast.show({ type: 'error', text1: 'Error al borrar', text2: error.message });
        }
      } else {
        Toast.show({ type: 'success', text1: 'Categoría eliminada' });
        await fetchAll(); 
      }
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error al borrar' });
    }
  };


  if (checkingAuth) {
    return (
      <Screen scroll={false}>
        <HeaderBar title="Categorías" />
        <View style={styles.centerContainer}>
          <ActivityIndicator />
          <Text style={{ color: colors.textMuted, marginTop: spacing(1) }}>Verificando permisos...</Text>
        </View>
      </Screen>
    );
  }
  if (!isAdmin) {
    return <Screen scroll={false}><HeaderBar title="Categorías" /></Screen>;
  }

  return (
    <Screen scroll={false}>
      <HeaderBar title="Categorías" />
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator />
          <Text style={{ color: colors.textMuted, marginTop: spacing(1) }}>Cargando categorías...</Text>
        </View>
      ) : (
        <View style={{ flex: 1, padding: 16 }}>
          <FlatList
            data={filtered}
            keyExtractor={(i) => String(i.id_categoria)}
            contentContainerStyle={{ paddingBottom: spacing(10), gap: spacing(2) }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListHeaderComponent={
              <View style={{ gap: spacing(2), marginBottom: spacing(1) }}>
                <TouchableOpacity
                  style={[ styles.addButton, { backgroundColor: colors.primary }]}
                  onPress={openCreateModal}> 
                  <PlusCircle color="white" size={18} />
                  <Text style={styles.addButtonText}>Añadir Categoría</Text>
                </TouchableOpacity>

                <Card>
                  <Input label="Buscar" value={q} onChangeText={setQ} placeholder="Filtrar por nombre" />
                </Card>

                <Text style={{ color: colors.text, marginTop: spacing(1), fontWeight: '700' }}>
                  Listado
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const productCount = item.Producto[0]?.count ?? 0;
              return (
                <Card style={{ paddingVertical: spacing(2), paddingHorizontal: spacing(2.5), gap: spacing(0.5) }}>
                  <View style={styles.row}>
                    <View style={styles.rowLeft}>
                      <Text style={[styles.idText, { color: colors.textMuted }]}>
                        #{item.id_categoria}
                      </Text>
                      <Text style={[styles.nameText, { color: colors.text }]}>
                        {item.nombre}
                      </Text>
                    </View>
                    
                    <View style={styles.rowRight}>
                      
                      {/* 👇👇 ¡AQUÍ ESTÁ EL ÚLTIMO ARREGLO! 👇👇 */}
                      <Text style={[styles.countText, { color: colors.textMuted }]}>
                        {`${productCount} ${productCount === 1 ? 'producto' : 'productos'}`}
                      </Text>
                      
                      <ContextMenu
                        trigger={<MoreVertical color={colors.textMuted} size={24} style={{ padding: 4 }} />}
                        items={[
                          {
                            label: 'Editar',
                            onPress: () => openEditModal(item),
                          },
                          {
                            label: 'Eliminar',
                            onPress: () => handleDelete(item),
                            destructive: true,
                          },
                        ]}
                      />
                    </View>
                  </View>

                  {item.descripcion ? (
                    <Text style={[styles.descText, { color: colors.textMuted }]}>
                      {item.descripcion}
                    </Text>
                  ) : null}
                </Card>
              );
            }}
            ListEmptyComponent={
              <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: spacing(4) }}>
                No hay categorías.
              </Text>
            }
          />
        </View>
      )}

      {/* Modal para "Crear" O "Editar" */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}>
          
          <Pressable
            style={styles.modalContainer}
            onPress={() => {}}>
            <Card>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 18, marginBottom: spacing(2) }}>
                {editingItem ? 'Editar categoría' : 'Nueva categoría'}
              </Text>
              <Input
                label="Nombre"
                value={name}
                onChangeText={setName}
                placeholder="Ej. Tintas"
                editable={!saving}
              />
              <Input
                label="Descripción (opcional)"
                value={desc}
                onChangeText={setDesc}
                placeholder="Detalle de la categoría"
                editable={!saving}
              />
              <Button 
                title={saving ? (editingItem ? 'Actualizando...' : 'Creando...') : (editingItem ? 'Actualizar' : 'Crear')}
                onPress={saveCategory} 
                disabled={saving} 
              />
              <Button
                title="Cancelar"
                onPress={() => setModalVisible(false)}
                disabled={saving}
                style={{ marginTop: spacing(1) }}
              />
            </Card>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

// Estilos
const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 1, 
  },
  rowRight: { 
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  idText: {
    fontSize: 12,
    fontWeight: '500',
    minWidth: 30,
  },
  nameText: {
    fontWeight: '700',
    fontSize: 16,
    flexShrink: 1, 
  },
  countText: {
    fontSize: 14,
  },
  descText: {
    marginTop: 4,
    marginLeft: 42, 
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    width: '90%',
    margin: 20,
  },
});