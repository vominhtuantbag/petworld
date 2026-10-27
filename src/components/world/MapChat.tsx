import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { MapChatMessage } from '../../net/worldPresence';
import { theme } from '../../theme/theme';

type Props = {
  messages: MapChatMessage[];
  onSend: (text: string) => void;
  onFocusChange: (focused: boolean) => void;
};

/** Shared map chat for everyone standing in the same zone. */
export function MapChat({ messages, onSend, onFocusChange }: Props) {
  const [text, setText] = useState('');
  const visible = messages.slice(-6);

  const send = () => {
    const next = text.trim();
    if (!next) return;
    onSend(next);
    setText('');
  };

  return (
    <View style={styles.dock} testID="map-chat" pointerEvents="auto">
      {visible.length > 0 ? (
        <View style={styles.log}>
          {visible.map((message) => (
            <Text key={message.id} style={styles.line} numberOfLines={2}>
              <Text style={styles.who}>{message.username}: </Text>
              {message.text}
            </Text>
          ))}
        </View>
      ) : null}
      <View style={styles.row}>
        <TextInput
          value={text}
          onChangeText={setText}
          onFocus={() => onFocusChange(true)}
          onBlur={() => onFocusChange(false)}
          onSubmitEditing={send}
          placeholder="Nhắn trên bản đồ..."
          placeholderTextColor={theme.dim}
          maxLength={120}
          style={styles.input}
          testID="map-chat-input"
          accessibilityLabel="Nhắn trên bản đồ"
        />
        <Pressable accessibilityRole="button" accessibilityLabel="Gửi" testID="map-chat-send" onPress={send} style={styles.send}>
          <Text style={styles.sendLabel}>Gửi</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: 148,
    bottom: 12,
    width: 280,
    zIndex: 30,
    gap: 4,
  },
  log: {
    maxHeight: 108,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(11, 22, 19, 0.72)',
    gap: 2,
  },
  line: { color: theme.ink, fontSize: 12 },
  who: { color: theme.gold, fontWeight: '800' },
  row: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  input: {
    flex: 1,
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: 10,
    color: theme.ink,
    backgroundColor: 'rgba(11, 22, 19, 0.82)',
    borderWidth: 1,
    borderColor: theme.line,
  },
  send: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.gold,
  },
  sendLabel: { color: theme.ink, fontWeight: '800' },
});
