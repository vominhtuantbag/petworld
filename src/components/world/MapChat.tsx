import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { MapChatMessage } from '../../net/worldPresence';
import { theme } from '../../theme/theme';

type Props = {
  messages: MapChatMessage[];
  online: number;
  selfUserId?: string | null;
  onSend: (text: string) => void;
  onFocusChange: (focused: boolean) => void;
};

/** Shared map chat. A tap on a name starts a private /whisper to that player. */
export function MapChat({ messages, online, selfUserId, onSend, onFocusChange }: Props) {
  const [text, setText] = useState('');
  const visible = messages.slice(-6);
  const whispering = /^\/(?:whisper|w)\s+\S+/i.test(text);

  const send = () => {
    const next = text.trim();
    if (!next) return;
    onSend(next);
    setText('');
  };

  const pick = (message: MapChatMessage) => {
    if (!message.userId || message.userId === selfUserId) return;
    if (message.username === 'Hệ thống') return;
    setText(`/whisper ${message.username} `);
    onFocusChange(true);
  };

  return (
    <View style={styles.dock} testID="map-chat" pointerEvents="auto">
      <Text style={styles.online} testID="map-online">{online > 0 ? `${online} người chơi khác trên map` : 'Chưa thấy người chơi khác'}</Text>
      {visible.length > 0 ? (
        <View style={styles.log}>
          {visible.map((message) => {
            const who = message.whisper
              ? message.userId === selfUserId
                ? `Bạn → ${message.toUsername ?? message.username}`
                : message.username
              : message.username;
            return (
              <Text key={message.id} style={message.whisper ? styles.whisper : styles.line} numberOfLines={2}>
                <Text
                  style={styles.who}
                  onPress={() => pick(message)}
                  suppressHighlighting
                  accessibilityRole="button"
                  accessibilityLabel={`Thì thầm với ${message.username}`}
                >
                  {who}
                </Text>
                {message.whisper ? ` thì thầm: ${message.text}` : `: ${message.text}`}
              </Text>
            );
          })}
        </View>
      ) : null}
      <View style={styles.row}>
        <TextInput
          value={text}
          onChangeText={setText}
          onFocus={() => onFocusChange(true)}
          onBlur={() => onFocusChange(false)}
          onSubmitEditing={send}
          placeholder={whispering ? 'Nội dung thì thầm...' : 'Nhắn trên bản đồ...'}
          placeholderTextColor={theme.dim}
          maxLength={120}
          style={styles.input}
          testID="map-chat-input"
          accessibilityLabel={whispering ? 'Thì thầm' : 'Nhắn trên bản đồ'}
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
  online: { color: theme.gold, fontSize: 11, fontWeight: '800' },
  log: {
    maxHeight: 108,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(11, 22, 19, 0.72)',
    gap: 2,
  },
  line: { color: theme.ink, fontSize: 12 },
  whisper: { color: '#d7c4ff', fontSize: 12 },
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
