import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Calendar } from '@/components/Calendar';
import { useSettingsStore } from '@/store/settings-store';
import { Colors } from '@/constants/colors';

interface DatePickerModalProps {
  visible: boolean;
  initialDate: Date;
  /**
   * Appelé avec la date sélectionnée quand l'user tape OK. Le parent décide
   * de la valider et de la persister (peut afficher un toast d'erreur si
   * invalide — la modal se ferme dans tous les cas).
   */
  onConfirm: (date: Date) => void;
  onCancel: () => void;
  /** Titre dans le header de la modal. Défaut : "Choisir une date". */
  title?: string;
}

/**
 * R1 audit : remplace le DateTimePicker natif Android (popup système blanc
 * hors-thème) et le spinner iOS par un calendrier mensuel custom thémé
 * dark/light, cohérent avec la vue Calendrier principale.
 *
 * Réutilise le composant `Calendar.tsx` existant (lundi-dimanche, navigation
 * mois précédent/suivant, tap sur titre = aujourd'hui), avec
 * showEventIndicators=false pour ne pas polluer la sélection.
 */
export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  initialDate,
  onConfirm,
  onCancel,
  title = 'Choisir une date',
}) => {
  const { darkMode } = useSettingsStore();
  const theme = darkMode ? Colors.dark : Colors.light;
  const [tempDate, setTempDate] = useState<Date>(initialDate);

  // Reset à chaque ouverture pour que la modal reflète bien la valeur courante
  // (sinon on garderait la dernière sélection annulée d'une session précédente).
  useEffect(() => {
    if (visible) setTempDate(initialDate);
  }, [visible, initialDate]);

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
            <TouchableOpacity onPress={() => onConfirm(tempDate)} style={styles.btn} hitSlop={8}>
              <Text style={[styles.btnText, { color: theme.primary, fontWeight: '700' }]}>OK</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.calendarWrapper}>
            <Calendar
              selectedDate={tempDate}
              onSelectDate={setTempDate}
              showEventIndicators={false}
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
    maxWidth: 380,
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
  calendarWrapper: {
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 12,
  },
});
