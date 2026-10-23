import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { GlowButton } from '../components/GlowButton';
import { ApiError } from '../net/api';
import { enterTournament, fetchTournament, listTournaments, simulateTournament, type CupDetail, type CupPreview, type CupSummary } from '../net/tournaments';
import { useAuth } from '../state/AuthContext';
import { useWorld } from '../state/WorldContext';
import { bandForLevel } from '../world/progression';
import { theme } from '../theme/theme';
import { useLayout } from '../theme/useLayout';

/**
 * Weekly regional cup and the monthly championship.
 * The list is polled while this screen is open. Simulate builds a preview
 * bracket and does not change the official board.
 */
export function TournamentScreen() {
  const auth = useAuth();
  const world = useWorld();
  const { font } = useLayout();
  const [cups, setCups] = useState<CupSummary[]>([]);
  const [detail, setDetail] = useState<CupDetail | null>(null);
  const [preview, setPreview] = useState<CupPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const band = bandForLevel(auth.character?.stats.level ?? 1);
  const weekly = cups.find((cup) => cup.kind === 'weekly' && cup.region === world.regionId && cup.tier === band.tier) ?? null;
  const monthly = cups.find((cup) => cup.kind === 'monthly') ?? null;

  useEffect(() => {
    const token = auth.token;
    if (!token) return;
    let stop = false;
    const load = () => {
      listTournaments(token)
        .then((list) => {
          if (!stop) setCups(list);
        })
        .catch((reason: unknown) => {
          if (!stop) setError(reason instanceof ApiError ? reason.message : 'Không tải được lịch giải.');
        });
    };
    load();
    const timer = setInterval(load, 15000);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, [auth.token]);

  useEffect(() => {
    const token = auth.token;
    if (!token || !weekly) return;
    let stop = false;
    fetchTournament(token, weekly.id)
      .then((cup) => {
        if (!stop) setDetail(cup);
      })
      .catch(() => {
        if (!stop) setDetail(null);
      });
    return () => {
      stop = true;
    };
  }, [auth.token, weekly?.id]);

  const register = () => {
    const token = auth.token;
    if (!token || !weekly) return;
    setBusy(true);
    setError(null);
    enterTournament(token, weekly.id)
      .then((cup) => {
        setDetail(cup);
        setCups((current) => current.map((item) => (item.id === cup.id ? { ...item, entrantCount: cup.entrants.length } : item)));
      })
      .catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : 'Không ghi danh được.'))
      .finally(() => setBusy(false));
  };

  const simulate = () => {
    const token = auth.token;
    if (!token || !weekly) return;
    setBusy(true);
    setError(null);
    simulateTournament(token, weekly.id)
      .then(setPreview)
      .catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : 'Không mô phỏng được.'))
      .finally(() => setBusy(false));
  };

  return (
    <View testID="tournament-screen" style={styles.screen}>
      <View style={styles.header}>
        <Text style={[styles.title, { fontSize: font(22) }]}>Giải đấu</Text>
        <Text accessibilityRole="button" onPress={world.returnToTown} style={[styles.back, { fontSize: font(14) }]}>
          Về thị trấn
        </Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
        <Text style={[styles.copy, { fontSize: font(14) }]}>
          Bảng {band.nameVi} (cấp máy chủ {band.levelMin}–{band.levelMax}). Đăng ký mở khoảng ba ngày trước giờ khai mạc.
        </Text>
        {weekly ? (
          <View style={styles.card}>
            <Text style={[styles.cardTitle, { fontSize: font(16) }]}>{weekly.nameVi}</Text>
            <Text style={styles.copy}>Khai mạc {formatWhen(weekly.startsAt)} · {weekly.entrantCount} người · {statusLabel(weekly.status)}</Text>
            <Text style={styles.copy}>Phần thưởng: {weekly.rewardTitle}</Text>
            <View style={styles.actions}>
              <GlowButton label={busy ? 'Đang gửi' : 'Ghi danh'} enabled={!busy && weekly.status === 'registration'} onPress={register} testID="cup-enter" />
              <GlowButton label="Mô phỏng nhánh đấu" enabled={!busy} onPress={simulate} testID="cup-simulate" />
            </View>
          </View>
        ) : (
          <Text style={styles.copy}>Đang lấy lịch tuần này…</Text>
        )}
        {detail && detail.entrants.length > 0 ? (
          <Text style={styles.copy}>Đã ghi danh: {detail.entrants.map((entry) => entry.username).join(', ')}</Text>
        ) : null}
        {detail && detail.matches.length > 0 ? <Bracket matches={detail.matches} /> : null}
        {preview ? (
          <View style={styles.card}>
            <Text style={[styles.cardTitle, { fontSize: font(16) }]}>Bản xem trước</Text>
            <Text style={styles.copy}>Vô địch mô phỏng: {preview.champion?.username ?? 'chưa có'} · {preview.rewardTitle}</Text>
            <Bracket matches={preview.matches} />
          </View>
        ) : null}
        {monthly ? (
          <Text style={styles.copy}>
            Vô địch tháng: {monthly.nameVi}, khai mạc {formatWhen(monthly.startsAt)}. Nhà vô địch khu vực trong tháng mới được vào.
            {monthly.championName ? ` Hiện tại: ${monthly.championName}.` : ''}
          </Text>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </View>
  );
}

function Bracket({ matches }: { matches: CupDetail['matches'] }) {
  return (
    <View>
      {matches.map((match) => (
        <Text key={match.id} style={styles.match}>
          Vòng {match.round}: {match.a?.username ?? 'bye'} vs {match.b?.username ?? 'bye'}
          {match.winnerId ? ` → ${match.a?.userId === match.winnerId ? match.a?.username : match.b?.username}` : ''}
        </Text>
      ))}
    </View>
  );
}

function statusLabel(status: CupSummary['status']): string {
  if (status === 'live') return 'đang diễn ra';
  if (status === 'complete') return 'đã kết thúc';
  return 'đang nhận đăng ký';
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  scroll: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12 },
  title: { color: theme.ink, fontWeight: '800' },
  back: { color: theme.gold, fontWeight: '700' },
  body: { padding: 16, gap: 10 },
  card: { backgroundColor: theme.card, borderRadius: 14, padding: 12, gap: 8 },
  cardTitle: { color: theme.ink, fontWeight: '800' },
  copy: { color: theme.muted, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  match: { color: theme.ink, fontSize: 13, marginTop: 4 },
  error: { color: '#e07a72', fontWeight: '700' },
});
