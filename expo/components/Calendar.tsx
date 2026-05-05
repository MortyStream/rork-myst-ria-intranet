import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useCalendarStore } from '@/store/calendar-store';
import { useSettingsStore } from '@/store/settings-store';
import { Colors } from '@/constants/colors';

// Fonctions utilitaires pour manipuler les dates
const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

// Retourne le jour de la semaine du 1er du mois en mode "Lundi=0, Dimanche=6"
// (convention européenne FR/CH) au lieu du défaut JS "Dimanche=0".
const getFirstDayOfMonth = (year: number, month: number) => {
  const jsDay = new Date(year, month, 1).getDay(); // 0=Dim, 1=Lun, ..., 6=Sam
  return jsDay === 0 ? 6 : jsDay - 1;              // 0=Lun, 1=Mar, ..., 6=Dim
};

const getMonthName = (month: number) => {
  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  return monthNames[month];
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

interface CalendarProps {
  onSelectDate: (date: Date) => void;
  selectedDate?: Date;
  /**
   * Affiche les pastilles de couleur sous chaque jour qui contient un event.
   * Désactiver pour les usages de date picker (TaskForm, event-form) où ce
   * serait du bruit visuel.
   */
  showEventIndicators?: boolean;
}

export const Calendar: React.FC<CalendarProps> = ({ onSelectDate, selectedDate, showEventIndicators = true }) => {
  const { darkMode } = useSettingsStore();
  // Souscription réactive à la liste complète d'events : toute modif re-rend le calendrier.
  // Quand showEventIndicators=false on évite les pastilles MAIS on subscribe quand même —
  // pas de cost réel, un re-render trivial si events changent pendant que le picker est ouvert.
  const events = useCalendarStore(state => state.events);
  const theme = darkMode ? Colors.dark : Colors.light;

  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // Convention FR/CH : la semaine commence le lundi
  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  // Calcul réactif des jours + couleurs basé sur events + mois
  const calendarDays = useMemo(() => {
    const days: Array<{ date: Date; isCurrentMonth: boolean; colors: string[]; total: number }> = [];
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDayOfMonth = getFirstDayOfMonth(currentYear, currentMonth);

    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const daysInPrevMonth = getDaysInMonth(prevMonthYear, prevMonth);

    // Renvoie les 3 premières couleurs ET le total — permet d'afficher "+N"
    // pour les jours qui ont plus de 3 events (avant : truncation silencieuse).
    // Court-circuité quand showEventIndicators=false (mode date picker).
    const getDayInfo = (date: Date): { colors: string[]; total: number } => {
      if (!showEventIndicators) return { colors: [], total: 0 };
      const matching = events.filter(e => {
        const d = new Date(e.startTime);
        return isSameDay(d, date);
      });
      return {
        colors: matching.slice(0, 3).map(e => e.color || theme.primary),
        total: matching.length,
      };
    };

    for (let i = 0; i < firstDayOfMonth; i++) {
      const day = daysInPrevMonth - firstDayOfMonth + i + 1;
      const date = new Date(prevMonthYear, prevMonth, day);
      const info = getDayInfo(date);
      days.push({ date, isCurrentMonth: false, colors: info.colors, total: info.total });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentYear, currentMonth, i);
      const info = getDayInfo(date);
      days.push({ date, isCurrentMonth: true, colors: info.colors, total: info.total });
    }

    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    const remainingDays = 42 - days.length;

    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(nextMonthYear, nextMonth, i);
      const info = getDayInfo(date);
      days.push({ date, isCurrentMonth: false, colors: info.colors, total: info.total });
    }

    return days;
  }, [currentMonth, currentYear, events, theme.primary, showEventIndicators]);

  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    onSelectDate(today);
  };

  const isToday = (date: Date) => isSameDay(date, new Date());

  const isSelectedDate = (date: Date) => {
    if (!selectedDate) return false;
    return isSameDay(date, selectedDate);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton}>
          <ChevronLeft size={24} color={theme.text} />
        </TouchableOpacity>

        <TouchableOpacity onPress={goToToday} style={styles.monthYearContainer}>
          <Text style={[styles.monthYearText, { color: theme.text }]}>
            {getMonthName(currentMonth)} {currentYear}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
          <ChevronRight size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      <View style={[styles.weekDaysContainer, { borderBottomColor: theme.border }]}>
        {weekDays.map((day, index) => (
          <View key={index} style={styles.weekDayCell}>
            <Text style={[styles.weekDayText, { color: darkMode ? theme.inactive : '#666666' }]}>
              {day}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.calendarGrid}>
        {Array.from({ length: 6 }).map((_, weekIdx) => (
          <View key={weekIdx} style={styles.weekRow}>
            {calendarDays.slice(weekIdx * 7, weekIdx * 7 + 7).map((day, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayCell,
                  isToday(day.date) && [styles.todayCell, { borderColor: theme.border }],
                  isSelectedDate(day.date) && [styles.selectedCell, { backgroundColor: `${theme.primary}30` }]
                ]}
                onPress={() => onSelectDate(day.date)}
              >
                <Text
                  style={[
                    styles.dayText,
                    !day.isCurrentMonth && { color: darkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' },
                    day.isCurrentMonth && { color: theme.text },
                    isToday(day.date) && { fontWeight: 'bold', color: theme.primary },
                    isSelectedDate(day.date) && { color: theme.primary, fontWeight: 'bold' }
                  ]}
                >
                  {day.date.getDate()}
                </Text>

                {day.colors.length > 0 && (
                  <View style={styles.indicatorsRow}>
                    {day.colors.map((c, i) => (
                      <View
                        key={i}
                        style={[
                          styles.eventIndicator,
                          {
                            backgroundColor: day.isCurrentMonth
                              ? c
                              : darkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'
                          }
                        ]}
                      />
                    ))}
                    {day.total > 3 && (
                      <Text style={[styles.moreEventsText, { color: day.isCurrentMonth ? theme.text : (darkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)') }]}>
                        +{day.total - 3}
                      </Text>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  navButton: {
    padding: 8,
  },
  monthYearContainer: {
    padding: 8,
  },
  monthYearText: {
    fontSize: 16,
    fontWeight: '600',
  },
  weekDaysContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingBottom: 8,
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '500',
  },
  calendarGrid: {
    flexDirection: 'column',
  },
  weekRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    minHeight: 44, // évite les cellules trop petites sur iPhone SE / écrans étroits
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  dayText: {
    fontSize: 14,
  },
  todayCell: {
    borderRadius: 20,
    borderWidth: 1,
  },
  selectedCell: {
    borderRadius: 20,
  },
  indicatorsRow: {
    flexDirection: 'row',
    marginTop: 2,
    gap: 2,
  },
  eventIndicator: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  moreEventsText: {
    fontSize: 9,
    fontWeight: '700',
    marginLeft: 1,
    opacity: 0.7,
  },
});
