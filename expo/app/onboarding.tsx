import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  StatusBar as RNStatusBar,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CheckSquare,
  Calendar,
  BookOpen,
  Bell,
  Search,
  Users,
} from 'lucide-react-native';
import { useSettingsStore } from '@/store/settings-store';
import { useAppColors, Colors } from '@/constants/colors';

const { width } = Dimensions.get('window');

interface Slide {
  id: string;
  title: string;
  body: string;
  gradient: [string, string];
  icons: React.ReactNode[];
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { markOnboardingSeen, darkMode } = useSettingsStore();
  const appColors = useAppColors();
  const theme = darkMode ? Colors.dark : Colors.light;

  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const slides: Slide[] = [
    {
      id: '1',
      title: 'Bienvenue sur Mystéria 👋',
      body: 'Tes tâches, ton calendrier et l\'annuaire de l\'asso au même endroit. Réponds aux invitations en un clic, marque tes tâches faites depuis la liste.',
      gradient: ['#4c6ef5', '#3b5bdb'],
      icons: [
        <CheckSquare key="1" size={48} color="#ffffff" />,
        <Calendar key="2" size={48} color="#ffffff" />,
        <Users key="3" size={48} color="#ffffff" />,
      ],
    },
    {
      id: '2',
      title: 'La Bible : tout est trouvable 📚',
      body: 'Procédures, fichiers, liens, notes du comité — organisés par pôle. La recherche te trouve n\'importe quoi en 2 lettres.',
      gradient: ['#ae3ec9', '#9c36b5'],
      icons: [
        <BookOpen key="1" size={48} color="#ffffff" />,
        <Search key="2" size={48} color="#ffffff" />,
      ],
    },
    {
      id: '3',
      title: 'On te garde au courant 🔔',
      body: 'Notifications pour les nouvelles tâches, invitations et rappels de deadline. Tape sur une notif pour aller direct à l\'élément concerné.',
      gradient: ['#f03e3e', '#e03131'],
      icons: [
        <Bell key="1" size={48} color="#ffffff" />,
      ],
    },
  ];

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      handleFinish();
    }
  };

  const handleSkip = () => {
    handleFinish();
  };

  const handleFinish = () => {
    markOnboardingSeen();
    router.replace('/home');
  };

  const renderSlide = ({ item }: { item: Slide }) => (
    <View style={[styles.slide, { width }]}>
      <LinearGradient
        colors={item.gradient}
        style={styles.iconCircle}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.iconRow}>
          {item.icons.map((icon, idx) => (
            <View key={idx} style={styles.iconWrapper}>
              {icon}
            </View>
          ))}
        </View>
      </LinearGradient>

      <Text style={[styles.title, { color: theme.text }]}>{item.title}</Text>
      <Text style={[styles.body, { color: darkMode ? theme.inactive : '#555' }]}>
        {item.body}
      </Text>
    </View>
  );

  const handleScroll = (event: { nativeEvent: { contentOffset: { x: number } } }) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    if (index !== currentIndex) setCurrentIndex(index);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <RNStatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />

      <View style={styles.skipContainer}>
        <TouchableOpacity onPress={handleSkip} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[styles.skipText, { color: darkMode ? theme.inactive : '#888' }]}>
            Passer
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        bounces={false}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                {
                  backgroundColor: idx === currentIndex ? appColors.primary : (darkMode ? '#444' : '#ddd'),
                  width: idx === currentIndex ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: appColors.primary }]}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text style={styles.nextButtonText}>
            {currentIndex === slides.length - 1 ? "C'est parti !" : 'Suivant'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 16 : 0,
  },
  skipContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '500',
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconWrapper: {
    margin: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  body: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 16,
    paddingTop: 16,
    gap: 24,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
