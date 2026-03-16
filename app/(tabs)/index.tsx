import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import Svg, { Path, Text as SvgText } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../../constants/colors';
import { useAuth } from '../../lib/auth-context';
import { allStations } from '../../lib/stations';
import {
  calculateRemainingRange,
  estimateChargeTime,
  haversineDistance,
  formatDistance,
} from '../../lib/routing';
import { EVStation } from '../../types';

function BatteryGauge({ soc, size = 180 }: { soc: number; size?: number }) {
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const startAngle = 135;
  const totalSweep = 270;
  const fillSweep = Math.max(0.5, (soc / 100) * totalSweep);

  function polarToXY(angle: number) {
    const rad = ((angle - 90) * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    };
  }

  function describeArc(start: number, sweep: number) {
    const s = polarToXY(start);
    const e = polarToXY(start + sweep);
    const large = sweep > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${large} 1 ${e.x} ${e.y}`;
  }

  const color =
    soc > 50 ? Colors.primary : soc > 20 ? Colors.warning : Colors.danger;

  return (
    <View style={styles.gaugeOuterContainer}>
      <Svg width={size} height={size} style={styles.gaugeSvg}>
        {/* Glow Layer */}
        <Path
          d={describeArc(startAngle, fillSweep)}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth + 4}
          strokeLinecap="round"
          opacity={0.15}
        />
        <Path
          d={describeArc(startAngle, totalSweep)}
          fill="none"
          stroke={Colors.border}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <Path
          d={describeArc(startAngle, fillSweep)}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <SvgText
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          fontSize={44}
          fontFamily="Inter_700Bold"
          fill={Colors.text}
        >
          {soc}%
        </SvgText>
        <SvgText
          x={cx}
          y={cy + 24}
          textAnchor="middle"
          fontSize={14}
          fontFamily="Inter_500Medium"
          fill={Colors.textSecondary}
        >
          Remaining
        </SvgText>
      </Svg>
    </View>
  );
}

function StationCard({
  station,
  distance,
}: {
  station: EVStation;
  distance: string;
}) {
  const isDC =
    station.type.toLowerCase().includes('dc') ||
    station.type.toLowerCase().includes('ccs') ||
    station.type.toLowerCase().includes('chademo');

  return (
    <View style={styles.stationCard}>
      <View
        style={[
          styles.stationIcon,
          { backgroundColor: isDC ? Colors.dcFast + '1A' : Colors.primaryMuted },
        ]}
      >
        <Ionicons
          name="flash"
          size={18}
          color={isDC ? Colors.dcFast : Colors.primary}
        />
      </View>
      <View style={styles.stationInfo}>
        <Text style={styles.stationName} numberOfLines={1}>
          {station.name}
        </Text>
        <Text style={styles.stationMeta}>
          {station.type} · {distance}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </View>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { user, soc, setSoc } = useAuth();
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'web') {
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            (pos) =>
              setUserLocation({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
              }),
            () => setUserLocation({ latitude: 17.7, longitude: 83.3 })
          );
        }
        return;
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      } else {
        setUserLocation({ latitude: 17.7, longitude: 83.3 });
      }
    })();
  }, []);

  const remainingRange = user
    ? calculateRemainingRange(soc, user.maxMileage)
    : 0;
  const chargeTime = estimateChargeTime(soc, 100, true);

  const nearbyStations = useMemo(() => {
    if (!userLocation) return allStations.slice(0, 5);
    return [...allStations]
      .map((s) => ({
        ...s,
        dist: haversineDistance(userLocation, {
          latitude: s.latitude,
          longitude: s.longitude,
        }),
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 5);
  }, [userLocation]);

  const socPresets = [1, 10, 25, 50, 75, 100];
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  if (!user) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: topPad + 16,
            paddingBottom: Platform.OS === 'web' ? 118 : 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Hi, {user.name.split(' ')[0]}
            </Text>
            <Text style={styles.vehicleLabel}>{user.evModel}</Text>
          </View>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {user.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>

        <LinearGradient
          colors={[Colors.surfaceElevated, Colors.surface]}
          style={styles.vehicleCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.gaugeContainer}>
            <BatteryGauge soc={soc} size={200} />
          </View>
          <View style={styles.rangeRow}>
            <View style={styles.rangeItem}>
              <View style={[styles.rangeIcon, { backgroundColor: Colors.primaryMuted }]}>
                <MaterialCommunityIcons name="road-variant" size={20} color={Colors.primary} />
              </View>
              <Text style={styles.rangeValue}>{remainingRange} km</Text>
              <Text style={styles.rangeLabel}>Distance Left</Text>
            </View>
            <View style={styles.rangeDivider} />
            <View style={styles.rangeItem}>
              <View style={[styles.rangeIcon, { backgroundColor: Colors.secondaryMuted }]}>
                <Ionicons name="time-outline" size={20} color={Colors.secondary} />
              </View>
              <Text style={styles.rangeValue}>
                {chargeTime > 60
                  ? `${Math.floor(chargeTime / 60)}h ${chargeTime % 60}m`
                  : `${chargeTime} min`}
              </Text>
              <Text style={styles.rangeLabel}>To 100% (DC)</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.socSection}>
          <LinearGradient
            colors={['rgba(255,255,255,0.03)', 'transparent']}
            style={styles.socGlassOverlay}
          />
          <View style={styles.socHeader}>
            <View>
              <Text style={styles.sectionTitle}>Charging Control Center</Text>
              <Text style={styles.sectionSubtitle}>Select desired charge level</Text>
            </View>
            <View style={[
              styles.socPercentageBadge, 
              { backgroundColor: soc > 50 ? Colors.primaryMuted : soc > 20 ? Colors.warningMuted : Colors.dangerMuted }
            ]}>
              <Text style={[
                styles.socPercentageText,
                { color: soc > 50 ? Colors.primary : soc > 20 ? Colors.warning : Colors.danger }
              ]}>{soc}%</Text>
            </View>
          </View>

          <View style={styles.socBarTrack}>
            <LinearGradient
              colors={
                soc > 50 ? ['#00E676', '#00C853'] : 
                soc > 20 ? ['#FFD740', '#FFAB00'] : 
                ['#FF5252', '#D50000']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.socBarFill, { width: `${soc}%` }]}
            >
              <View style={styles.socBarGlow} />
            </LinearGradient>
          </View>

          <View style={styles.socPresetsRow}>
            {socPresets.map((val) => (
              <Pressable
                key={val}
                style={[
                  styles.socPresetItem,
                  soc === val && styles.socPresetActive,
                ]}
                onPress={() => {
                  setSoc(val);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }}
              >
                <Text
                  style={[
                    styles.socPresetLabel,
                    soc === val && styles.socPresetLabelActive,
                  ]}
                >
                  {val}%
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.socControlRow}>
            <Pressable
              style={styles.socControlBtn}
              onPress={() => {
                setSoc(Math.max(0, soc - 1));
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Ionicons name="remove" size={24} color={Colors.text} />
            </Pressable>
            
            <View style={styles.socControlInfo}>
              <Text style={styles.socControlMain}>{soc}%</Text>
              <Text style={styles.socControlSub}>Fine Adjustment</Text>
            </View>

            <Pressable
              style={styles.socControlBtn}
              onPress={() => {
                setSoc(Math.min(100, soc + 1));
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Ionicons name="add" size={24} color={Colors.text} />
            </Pressable>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons
              name="battery-charging"
              size={22}
              color={Colors.primary}
            />
            <Text style={styles.statValue}>{user.batteryCapacity}</Text>
            <Text style={styles.statLabel}>kWh</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialCommunityIcons
              name="road-variant"
              size={22}
              color={Colors.secondary}
            />
            <Text style={styles.statValue}>{user.maxMileage}</Text>
            <Text style={styles.statLabel}>Max km</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="flash" size={22} color={Colors.warning} />
            <Text style={styles.statValue}>
              {Math.round(user.batteryCapacity * (soc / 100) * 10) / 10}
            </Text>
            <Text style={styles.statLabel}>kWh left</Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.planButton,
            pressed && styles.planButtonPressed,
          ]}
          onPress={() => {
            router.push('/(tabs)/map');
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }}
        >
          <Ionicons name="navigate" size={20} color="#0A0E14" />
          <Text style={styles.planButtonText}>Plan Your Trip</Text>
        </Pressable>

        <View style={styles.nearbySection}>
          <Text style={styles.sectionTitle}>Nearby Stations</Text>
          {nearbyStations.map((station) => {
            const dist = userLocation
              ? haversineDistance(userLocation, {
                latitude: station.latitude,
                longitude: station.longitude,
              })
              : 0;
            return (
              <StationCard
                key={station.id}
                station={station}
                distance={userLocation ? formatDistance(dist) : station.city}
              />
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  vehicleLabel: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: Colors.primary,
  },
  vehicleCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  gaugeOuterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    marginBottom: 10,
  },
  gaugeSvg: {
    ...Platform.select({
      ios: {
        shadowColor: '#00E676',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 15,
      },
    }),
  },
  gaugeContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  rangeItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  rangeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  rangeValue: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  rangeLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rangeDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
    opacity: 0.5,
  },
  socSection: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    position: 'relative',
  },
  socGlassOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
  },
  socHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  socPercentageBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  socPercentageText: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  socBarTrack: {
    height: 12,
    backgroundColor: Colors.border,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 28,
  },
  socBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  socBarGlow: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 20,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 10,
  },
  socPresetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 28,
  },
  socPresetItem: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  socPresetActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  socPresetLabel: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textSecondary,
  },
  socPresetLabelActive: {
    color: '#0A0E14',
  },
  socControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  socControlBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  socControlInfo: {
    alignItems: 'center',
  },
  socControlMain: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: Colors.text,
  },
  socControlSub: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.textMuted,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  planButton: {
    backgroundColor: Colors.primary,
    height: 54,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 28,
  },
  planButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  planButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: '#0A0E14',
  },
  nearbySection: {
    gap: 10,
  },
  stationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stationIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stationInfo: {
    flex: 1,
  },
  stationName: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
  },
  stationMeta: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
