import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useCalendarStore } from '@/store/calendar-store';
import { useSettingsStore } from '@/store/settings-store';
import { Colors } from '@/constants/colors';

// Fonctions utilitaires pour manipuler les dates
const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
  // getDay() retourne 0 pour dimanche, 1 pour lundi, etc.
  return new Date(year, month, 1).getDay();
};

const getMonthName = (month: number) => {
  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  return monthNames[month];
};

interface CalendarProps {
  onSelectDate: (date: Date) => void;
  selectedDate?: Date;
}

export const Calendar: React.FC<CalendarProps> = ({ onSelectDate, selectedDate }) => {
  const { darkMode } = useSettingsStore();
  const { getEventsByDate } = useCalendarStore();
  const theme = darkMode ? Colors.dark : Colors.light;

  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [calendarDays, setCalendarDays] = useState<Array<{ date: Date; isCurrentMonth: boolean; hasEvents: boolean }>>([]);

  // Jours de la semaine (commençant par dimanche)
  const weekDays = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  useEffect(() => {
    generateCalendarDays();
  }, [currentMonth, currentYear]);

  const generateCalendarDays = () => {
    const days = [];
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDayOfMonth = getFirstDayOfMonth(currentYear, currentMonth);

    // Jours du mois précédent pour compléter la première semaine
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const daysInPrevMonth = getDaysInMonth(prevMonthYear, prevMonth);

    for (let i = 0; i < firstDayOfMonth; i++) {
      const day = daysInPrevMonth - firstDayOfMonth + i + 1;
      const date = new Date(prevMonthYear, prevMonth, day);
      const events = getEventsByDate(date);
      days.push({
        date,
        isCurrentMonth: false,
        hasEvents: events.length > 0
      });
    }

    // Jours du mois courant
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentYear, currentMonth, i);
      const events = getEventsByDate(date);
      days.push({
        date,
        isCurrentMonth: true,
        hasEvents: events.length > 0
      });
    }

    // Jours du mois suivant pour compléter la dernière semaine
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    const remainingDays = 42 - days.length; // 6 semaines * 7 jours = 42

    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(nextMonthYear, nextMonth, i);
      const events = getEventsByDate(date);
      days.push({
        date,
        isCurrentMonth: false,
        hasEvents: events.length > 0
      });
    }

    setCalendarDays(days);
  };

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

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelectedDate = (date: Date) => {
    if (!selectedDate) return false;
    
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  return (
    <View style={styles.container}>
      {/* Header with month navigation */}
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

      {/* Weekday headers */}
      <View style={styles.weekDaysContainer}>
        {weekDays.map((day, index) => (
          <View key={index} style={styles.weekDayCell}>
            <Text style={[styles.weekDayText, { color: darkMode ? theme.inactive : '#666666' }]}>
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.calendarGrid}>
        {calendarDays.map((day, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.dayCell,
              isToday(day.date) && styles.todayCell,
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
            
            {day.hasEvents && (
              <View 
                style={[
                  styles.eventIndicator, 
                  { backgroundColor: day.isCurrentMonth ? theme.primary : darkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }
                ]} 
              />
            )}
          </TouchableOpacity>
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
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
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
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
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
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  selectedCell: {
    borderRadius: 20,
  },
  eventIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
  },
});