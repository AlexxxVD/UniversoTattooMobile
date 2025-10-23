import type { Href } from 'expo-router';
import { Link } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

type Item = { label: string; href: Href | string };

export default function HamburgerMenu({ items }: { items: Item[] }) {
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(320, Math.floor(width * 0.78));
  const translate = useRef(new Animated.Value(-drawerWidth)).current;
  const [open, setOpen] = useState(false);

  const openDrawer = () => {
    setOpen(true);
    Animated.timing(translate, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  };

  const closeDrawer = () => {
    Animated.timing(translate, {
      toValue: -drawerWidth,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setOpen(false));
  };

  return (
    <>
      {/* Botón hamburguesa */}
      <Pressable accessibilityLabel="Abrir menú" onPress={openDrawer} style={styles.burger}>
        <View style={styles.bar} />
        <View style={[styles.bar, { width: 18 }]} />
        <View style={[styles.bar, { width: 22 }]} />
      </Pressable>

      <Modal visible={open} transparent statusBarTranslucent animationType="none">
        <Pressable style={styles.backdrop} onPress={closeDrawer} />

        <Animated.View
          style={[
            styles.drawer,
            { width: drawerWidth, transform: [{ translateX: translate }] },
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Menú</Text>
            <Pressable onPress={closeDrawer} style={styles.closeButton}>
              <Text style={styles.closeText}>Cerrar</Text>
            </Pressable>
          </View>

          <View style={styles.items}>
            {items.map((it, idx) => (
              <Link
                key={idx}
                href={it.href as Href}
                asChild
              >
                <Pressable
                  onPress={closeDrawer}
                  style={({ pressed }) => [
                    styles.item,
                    pressed && { backgroundColor: '#f2f2f2' },
                  ]}
                >
                  <Text style={styles.itemText}>{it.label}</Text>
                </Pressable>
              </Link>
            ))}
          </View>
        </Animated.View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  burger: {
    position: 'absolute',
    left: 12,
    top: 12,
    zIndex: 50,
    padding: 8,
    borderRadius: 8,
  },
  bar: {
    height: 2.5,
    backgroundColor: '#111',
    marginVertical: 3,
    width: 24,
    borderRadius: 2,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#fff',
    paddingTop: 42,
    paddingHorizontal: 12,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  closeButton: { padding: 6 },
  closeText: { color: '#007AFF' },
  items: { marginTop: 8, gap: 6 },
  item: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  itemText: { fontSize: 16 },
});