import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { WheelPicker } from '@/components/WheelPicker';
import { useSettingsStore } from '@/store/settings-store';
import { Colors } from '@/constants/colors';

interface TimePickerModalProps {
  visible: boolean;
  /**
   * Date dont on extrait l'heure initiale (heures + minutes). La date elle-
   * même est préservée lors de la confirmation (seuls H/M sont modifiés).
   */
  initialTime: Date;
  /** Reçoit une nouvelle Date avec le même jour que initialTime + H/M choisis. */
  onConfirm: (time: Date) => void;
  onCancel: () => void;
  title?: string;
}

const HOUR_VALUES = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTE_VALUES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

/**
 * R2 audit : remplace le DateTimePicker natif Android (system dialog hors-thème)
 * et le spinner iOS par 2 wheels custom (heures + minutes), thémés dark/light,
 * cohérents visuellement avec DatePickerModal.
 *
 * Format 24h. Confirmation via OK, annulation via tap backdrop ou bouton Annuler.
 */
export const TimePickerModal: React.FC<TimePickerModalProps> = ({
  visible,
  initialTime,
  onConfirm,
  onCancel,
  title = 'Choisir une heure',
}) => {
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  const [hours, setHours] = useState<number>(initialTime.getHours());
  const [minutes, setMinutes] = useState<number>(initialTime.getMinutes());

  // Reset à chaque ouverture pour refléter la valeur courante (la modal reste
  // montée sous le capot quand visible passe à false → sans ce reset on
  // garderait la dernière sélection annulée).
  useEffect(() => {
    if (visible) {
      setHours(initialTime.getHours());
      setMinutes(initialTime.getMinutes());
    }
  }, [visible, initialTime]);

  const handleOK = () => {
    const result = new Date(initialTime);
    result.setHours(hours, minutes, 0, 0);
    onConfirm(result);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onCancel}
      />
      <View style={styles.centeringWrapper} pointerEvents="box-none">
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={onCancel} style={styles.btn} hitSlop={8}>
              <Text style={[styles.btnText, { color: theme.inactive }]}>Annuler</Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
              {title}
            </Text>
            <TouchableOpacity onPress={handleOK} style={styles.btn} hitSlop={8}>
              <Text style={[styles.btnText, { color: theme.primary, fontWeight: '700' }]}>OK</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.wheelsRow}>
            <WheelPicker
              values={HOUR_VALUES}
              selectedIndex={hours}
              onChange={setHours}
            />
            <Text style={[styles.colon, { color: theme.text }]}>:</Text>
            <WheelPicker
              values={MINUTE_VALUES}
              selectedIndex={minutes}
              onChange={setMinutes}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  centeringWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  btn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    minWidth: 64,
  },
  btnText: {
    fontSize: 16,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  wheelsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  colon: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
});
