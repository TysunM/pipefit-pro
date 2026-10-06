// The backup nudge on Home
// ------------------------
// Shown when there is something on the phone worth keeping and it has not
// been backed up in a week (or ever). One tap makes the backup right here;
// "Not today" puts it off a day. See backup.ts shouldNudge.
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { useBackupNow } from '../state/useBackupNow';
import { useBackupSnooze } from '../state/lastBackup';
import { counted, shouldNudge } from '../state/backup';

export function BackupNudge() {
  const t = useTheme();
  const { total, summary, backUp, busy, lastAt } = useBackupNow();
  const { until, snooze } = useBackupSnooze();
  const [note, setNote] = useState<string | null>(null);
  const now = Date.now();
  const { show, days } = shouldNudge({ lastAt, snoozedUntil: until, records: total, now });
  if (!show && !note) return null;

  const biggest = [...summary].sort((a, b) => b.count - a.count).slice(0, 2).map((s) => counted(s.count, s.label)).join(', ');
  const button = (label: string, onPress: () => void, primary: boolean) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 48,
        borderRadius: t.radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: primary ? t.colors.warnText : 'transparent',
        borderWidth: primary ? 0 : 1,
        borderColor: t.colors.warnText,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Text style={[t.type.bodyStrong, { color: primary ? t.colors.warnBg : t.colors.warnText }]}>{label}</Text>
    </Pressable>
  );

  return (
    <View
      accessibilityRole="alert"
      style={{
        marginHorizontal: t.layout.screenPadding,
        marginTop: t.space.lg,
        padding: t.space.md,
        gap: t.space.md,
        borderRadius: t.radius.lg,
        backgroundColor: t.colors.warnBg,
        borderWidth: 1,
        borderColor: t.colors.warnText,
      }}
    >
      {note ? (
        <Text style={[t.type.bodyStrong, { color: t.colors.warnText }]}>{note}</Text>
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: t.space.md, alignItems: 'center' }}>
            <Ionicons name="cloud-upload-outline" size={26} color={t.colors.warnText} />
            <View style={{ flex: 1 }}>
              <Text style={[t.type.bodyStrong, { color: t.colors.warnText }]}>
                {days === null ? 'This phone has never been backed up' : `Last backup ${days} days ago`}
              </Text>
              <Text style={[t.type.caption, { color: t.colors.warnText }]}>{`${biggest}${summary.length > 2 ? ' and more' : ''} live only on this phone.`}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: t.space.md }}>
            {button(busy ? 'Making it…' : 'Back up now', () => {
              if (busy) return;
              void backUp().then((out) => setNote(out.ok ? 'Backed up. Keep that file somewhere off this phone.' : out.why));
            }, true)}
            {button('Not today', () => snooze(now), false)}
          </View>
        </>
      )}
    </View>
  );
}
