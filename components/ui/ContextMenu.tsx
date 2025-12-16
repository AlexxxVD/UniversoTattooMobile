import React, { useState } from 'react';
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewStyle,
} from 'react-native';

import { useTheme } from '../../theme';

export type ContextMenuItem = {
  label: string;
  onPress: () => void;
  destructive?: boolean;
};

type ContextMenuProps = {
  trigger: React.ReactNode;
  items: ContextMenuItem[];
  style?: ViewStyle;
};

export function ContextMenu({ trigger, items, style }: ContextMenuProps) {
  const { colors, spacing } = useTheme();
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handlePress = (event: any) => {
    const { pageX, pageY } = event.nativeEvent;
    setPosition({ x: pageX, y: pageY });
    setVisible(true);
  };

  const handleItemPress = (item: ContextMenuItem) => {
    setVisible(false);
    item.onPress();
  };

  return (
    <>
      <TouchableOpacity onPress={handlePress} style={style}>
        {trigger}
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <View
            style={[
              styles.menu,
              {
                backgroundColor: colors.surface,
                top: position.y,
                left: Math.min(position.x - 150, 300), // Ajustar para no salir de pantalla
                borderColor: colors.surfaceBorder,
              },
            ]}>
            {items.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.menuItem,
                  { borderBottomColor: colors.surfaceBorder },
                  index === items.length - 1 && styles.lastItem,
                ]}
                onPress={() => handleItemPress(item)}>
                <Text
                  style={[
                    styles.menuItemText,
                    { color: item.destructive ? '#ef4444' : colors.text },
                  ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menu: {
    position: 'absolute',
    minWidth: 150,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    fontSize: 16,
  },
});
