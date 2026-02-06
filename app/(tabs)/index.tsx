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
import Colors from '@/constants/colors';
import { useAuth } from '@/lib/auth-context';
import { allStations } from '@/lib/stations';
import {
  calculateRemainingRange,
  estimateChargeTime,
  haversineDistance,
  formatDistance,
} from '@/lib/routing';
import { EVStation } from '@/types';

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
    <Svg width={size} height={size}>
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
        fontSize={42}
        fontWeight="700"
        fill={Colors.text}
      >
        {soc}%
      </SvgText>
      <SvgText
        x={cx}
        y={cy + 22}
        textAnchor="middle"
        fontSize={13}
        fill={Colors.textSecondary}
      >
        Battery
      </SvgText>
    </Svg>
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

  const socPresets = [10, 25, 50, 75, 100];
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
            <BatteryGauge soc={soc} size={180} />
          </View>
          <View style={styles.rangeRow}>
            <View style={styles.rangeItem}>
              <MaterialCommunityIcons
                name="road-variant"
                size={18}
                color={Colors.primary}
              />
              <Text style={styles.rangeValue}>{remainingRange} km</Text>
              <Text style={styles.rangeLabel}>Est. Range</Text>
            </View>
            <View style={styles.rangeDivider} />
            <View style={styles.rangeItem}>
              <Ionicons name="time-outline" size={18} color={Colors.secondary} />
              <Text style={styles.rangeValue}>
                {chargeTime > 60
                  ? `${Math.floor(chargeTime / 60)}h ${chargeTime % 60}m`
                  : `${chargeTime} min`}
              </Text>
              <Text style={styles.rangeLabel}>To Full (DC)</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.socSection}>
          <View style={styles.socHeader}>
            <Text style={styles.sectionTitle}>Adjust Battery Level</Text>
            <View style={styles.socBadge}>
              <Text style={styles.socBadgeText}>{soc}%</Text>
            </View>
          </View>
          <View style={styles.socBar}>
            <View
              style={[
                styles.socFill,
                {
                  width: `${soc}%`,
                  backgroundColor:
                    soc > 50
                      ? Colors.primary
                      : soc > 20
                      ? Colors.warning
                      : Colors.danger,
                },
              ]}
            />
          </View>
          <View style={styles.socPresets}>
            {socPresets.map((val) => (
              <Pressable
                key={val}
                style={[
                  styles.socPresetBtn,
                  soc === val && styles.socPresetActive,
                ]}
                onPress={() => {
                  setSoc(val);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text
                  style={[
                    styles.socPresetText,
                    soc === val && styles.socPresetTextActive,
                  ]}
                >
                  {val}%
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.socAdjust}>
            <Pressable
              style={styles.socAdjustBtn}
              onPress={() => {
                setSoc(Math.max(0, soc - 5));
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Ionicons name="remove" size={22} color={Colors.text} />
            </Pressable>
            <Text style={styles.socAdjustLabel}>Fine tune</Text>
            <Pressable
              style={styles.socAdjustBtn}
              onPress={() => {
                setSoc(Math.min(100, soc + 5));
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Ionicons name="add" size={22} color={Colors.text} />
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
  gaugeContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  rangeItem: {
    alignItems: 'center',
    gap: 4,
  },
  rangeValue: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: Colors.text,
  },
  rangeLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.textMuted,
  },
  rangeDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
  },
  socSection: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  socHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
  },
  socBadge: {
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  socBadgeText: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: Colors.primary,
  },
  socBar: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  socFill: {
    height: '100%',
    borderRadius: 4,
  },
  socPresets: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  socPresetBtn: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  socPresetActive: {
    backgroundColor: Colors.primaryMuted,
    borderColor: Colors.primary,
  },
  socPresetText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textSecondary,
  },
  socPresetTextActive: {
    color: Colors.primary,
  },
  socAdjust: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  socAdjustBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  socAdjustLabel: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.textMuted,
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
