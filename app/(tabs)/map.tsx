import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Keyboard,
  Platform,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { CrowdHeatmap } from '../../components/CrowdHeatmap';
import { useCrowdDensity } from '../../hooks/useCrowdDensity';
import MapView, { Marker, Polyline } from '../../components/MapViewWrapper';
import Colors from '../../constants/colors';
import { useAuth } from '../../lib/auth-context';
import { allStations } from '../../lib/stations';
import {
  geocodeSearch,
  getRoute,
  planChargingStops,
  calculateRemainingRange,
  formatDistance,
  formatDuration,
  haversineDistance,
} from '../../lib/routing';
import { EVStation, SearchResult, TripPlan } from '../../types';

function isDCType(type: string): boolean {
  const t = type.toLowerCase();
  return t.includes('dc') || t.includes('ccs') || t.includes('chademo');
}

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { user, soc } = useAuth();
  const mapRef = useRef<MapView>(null);

  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const { stationStatuses } = useCrowdDensity(allStations, location, user?.id);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedStation, setSelectedStation] = useState<EVStation | null>(
    null
  );
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [routeError, setRouteError] = useState('');

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'web') {
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            (pos) =>
              setLocation({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
              }),
            () => setLocation({ latitude: 17.7, longitude: 83.3 })
          );
        } else {
          setLocation({ latitude: 17.7, longitude: 83.3 });
        }
        return;
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      } else {
        setLocation({ latitude: 17.7, longitude: 83.3 });
      }
    })();
  }, []);

  useEffect(() => {
    if (searchQuery.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await geocodeSearch(searchQuery);
      setSearchResults(results);
      setShowResults(results.length > 0);
      setIsSearching(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectDestination = useCallback(
    async (result: SearchResult) => {
      Keyboard.dismiss();
      setShowResults(false);
      setRouteError('');
      const shortName = result.display_name.split(',').slice(0, 2).join(',');
      setSearchQuery(shortName);
      setIsLoadingRoute(true);

      const dest = {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
      };
      const origin = location || { latitude: 17.7, longitude: 83.3 };

      const routeData = await getRoute(origin, dest);

      if (!routeData || !user) {
        setRouteError(
          routeData ? 'No user data found.' : 'Could not calculate route. Try a different destination.'
        );
        setIsLoadingRoute(false);
        return;
      }

      const remainingRange = calculateRemainingRange(soc, user.maxMileage);
      const canComplete = remainingRange >= routeData.distance * 1.1;

      const chargingStops = canComplete
        ? []
        : planChargingStops(
          routeData.distance,
          soc,
          user.maxMileage,
          allStations,
          routeData.coordinates
        );

      const totalChargingTime = chargingStops.reduce((acc, stop) => acc + stop.chargingTimeMinutes, 0);
      const totalWaitTime = chargingStops.reduce((acc, stop) => acc + stop.waitTimeMinutes, 0);
      const totalDuration = routeData.duration + totalChargingTime + totalWaitTime;

      setTripPlan({
        destination: {
          name: result.display_name,
          latitude: dest.latitude,
          longitude: dest.longitude,
        },
        totalDistance: routeData.distance,
        totalDuration,
        totalWaitTime,
        canComplete,
        chargingStops,
        routeCoordinates: routeData.coordinates,
      });
      setSelectedStation(null);

      if (mapRef.current && routeData.coordinates.length > 0) {
        const allPoints = [origin, dest];
        chargingStops.forEach((s) =>
          allPoints.push({
            latitude: s.station.latitude,
            longitude: s.station.longitude,
          })
        );
        mapRef.current.fitToCoordinates(allPoints, {
          edgePadding: { top: 180, right: 60, bottom: 300, left: 60 },
          animated: true,
        });
      }

      setIsLoadingRoute(false);
    },
    [location, user, soc]
  );

  const clearTrip = useCallback(() => {
    setTripPlan(null);
    setSearchQuery('');
    setSelectedStation(null);
    setRouteError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const centerOnUser = useCallback(() => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion(
        { ...location, latitudeDelta: 0.08, longitudeDelta: 0.08 },
        500
      );
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [location]);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 84 + 34 : 90;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={
          location
            ? { ...location, latitudeDelta: 0.15, longitudeDelta: 0.15 }
            : {
              latitude: 20.5937,
              longitude: 78.9629,
              latitudeDelta: 25,
              longitudeDelta: 25,
            }
        }
        showsUserLocation
        showsMyLocationButton={false}
        onPress={() => {
          Keyboard.dismiss();
          setShowResults(false);
          if (selectedStation) setSelectedStation(null);
        }}
      >
        <CrowdHeatmap />

        {allStations.map((station) => {
          const status = stationStatuses[station.id];
          const isCrowded = status?.densityLevel === 'HIGH' || status?.densityLevel === 'CRITICAL';

          return (
            <Marker
              key={station.id}
              coordinate={{
                latitude: station.latitude,
                longitude: station.longitude,
              }}
              pinColor={isCrowded ? Colors.danger : (isDCType(station.type) ? Colors.dcFast : Colors.acCharger)}
              title={isCrowded ? `HIGH DEMAND: ${station.name}` : station.name}
              description={isCrowded ? `${status?.userCount} users nearby (High Wait Time)` : undefined}
              onPress={() => {
                setSelectedStation(station);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              {isCrowded && (
                <View style={{ backgroundColor: 'rgba(255,0,0,0.3)', width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: 'red' }} />
              )}
            </Marker>
          )
        })}

        {tripPlan && tripPlan.routeCoordinates.length > 1 && (
          <Polyline
            coordinates={tripPlan.routeCoordinates}
            strokeColor={Colors.secondary}
            strokeWidth={4}
          />
        )}

        {tripPlan && (
          <Marker
            coordinate={{
              latitude: tripPlan.destination.latitude,
              longitude: tripPlan.destination.longitude,
            }}
            pinColor={Colors.danger}
          />
        )}

        {tripPlan?.chargingStops.map((stop, i) => (
          <Marker
            key={`cs-${i}`}
            coordinate={{
              latitude: stop.station.latitude,
              longitude: stop.station.longitude,
            }}
            pinColor="#FFD740"
          />
        ))}
      </MapView>

      <View style={[styles.searchContainer, { top: topPad + 8 }]}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Where are you going?"
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => {
              if (searchResults.length > 0) setShowResults(true);
            }}
            returnKeyType="search"
          />
          {isSearching && (
            <ActivityIndicator size="small" color={Colors.primary} />
          )}
          {searchQuery.length > 0 && !isSearching && (
            <Pressable
              onPress={() => {
                setSearchQuery('');
                setShowResults(false);
              }}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={Colors.textMuted}
              />
            </Pressable>
          )}
        </View>

        {showResults && (
          <View style={styles.resultsContainer}>
            {searchResults.map((result) => (
              <Pressable
                key={result.place_id}
                style={({ pressed }) => [
                  styles.resultItem,
                  pressed && styles.resultItemPressed,
                ]}
                onPress={() => handleSelectDestination(result)}
              >
                <Ionicons name="location" size={18} color={Colors.primary} />
                <Text style={styles.resultText} numberOfLines={2}>
                  {result.display_name}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {!!routeError && !tripPlan && (
        <View style={[styles.errorBanner, { top: topPad + 72 }]}>
          <Ionicons name="alert-circle" size={16} color={Colors.danger} />
          <Text style={styles.errorBannerText}>{routeError}</Text>
          <Pressable onPress={() => setRouteError('')}>
            <Ionicons name="close" size={16} color={Colors.textMuted} />
          </Pressable>
        </View>
      )}

      <Pressable
        style={[
          styles.myLocationBtn,
          {
            bottom:
              (tripPlan
                ? 290
                : selectedStation
                  ? 200
                  : bottomPad + 16),
          },
        ]}
        onPress={centerOnUser}
      >
        <Ionicons name="locate" size={22} color={Colors.text} />
      </Pressable>

      {user && !tripPlan && !selectedStation && (
        <View
          style={[
            styles.rangeBadge,
            { bottom: bottomPad + 16 },
          ]}
        >
          <Ionicons
            name="battery-half"
            size={16}
            color={
              soc > 50
                ? Colors.primary
                : soc > 20
                  ? Colors.warning
                  : Colors.danger
            }
          />
          <Text style={styles.rangeBadgeText}>
            {soc}% · {calculateRemainingRange(soc, user.maxMileage)} km range
          </Text>
        </View>
      )}

      {isLoadingRoute && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Planning route...</Text>
          </View>
        </View>
      )}

      {selectedStation && !tripPlan && (
        <View
          style={[styles.bottomPanel, { paddingBottom: bottomPad + 8 }]}
        >
          <View style={styles.panelHandle} />
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle} numberOfLines={1}>
              {selectedStation.name}
            </Text>
            <Pressable onPress={() => setSelectedStation(null)}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </Pressable>
          </View>
          <View style={styles.stationTypeRow}>
            <View
              style={[
                styles.typeBadge,
                {
                  backgroundColor: isDCType(selectedStation.type)
                    ? Colors.dcFast + '1A'
                    : Colors.primaryMuted,
                },
              ]}
            >
              <Ionicons
                name="flash"
                size={14}
                color={
                  isDCType(selectedStation.type)
                    ? Colors.dcFast
                    : Colors.primary
                }
              />
              <Text
                style={[
                  styles.typeText,
                  {
                    color: isDCType(selectedStation.type)
                      ? Colors.dcFast
                      : Colors.primary,
                  },
                ]}
              >
                {selectedStation.type}
              </Text>
            </View>
            {location && (
              <Text style={styles.distanceText}>
                {formatDistance(
                  haversineDistance(location, {
                    latitude: selectedStation.latitude,
                    longitude: selectedStation.longitude,
                  })
                )}{' '}
                away
              </Text>
            )}
          </View>
          <Text style={styles.addressText}>
            {selectedStation.address}, {selectedStation.city},{' '}
            {selectedStation.state}
          </Text>
        </View>
      )}

      {tripPlan && (
        <View style={[styles.tripPanel, { paddingBottom: bottomPad + 8 }]}>
          <View style={styles.panelHandle} />
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle} numberOfLines={1}>
              {tripPlan.destination.name.split(',').slice(0, 2).join(',')}
            </Text>
            <Pressable onPress={clearTrip}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.tripStats}>
            <View style={styles.tripStat}>
              <MaterialCommunityIcons
                name="road-variant"
                size={18}
                color={Colors.secondary}
              />
              <Text style={styles.tripStatValue}>
                {formatDistance(tripPlan.totalDistance)}
              </Text>
              <Text style={styles.tripStatLabel}>Distance</Text>
            </View>
            <View style={styles.tripStatDivider} />
            <View style={styles.tripStat}>
              <Ionicons name="time" size={18} color={Colors.secondary} />
              <Text style={styles.tripStatValue}>
                {formatDuration(tripPlan.totalDuration)}
              </Text>
              <Text style={styles.tripStatLabel}>Duration</Text>
            </View>
            <View style={styles.tripStatDivider} />
            <View style={styles.tripStat}>
              <Ionicons
                name="flash"
                size={18}
                color={
                  tripPlan.canComplete ? Colors.primary : Colors.warning
                }
              />
              <Text
                style={[
                  styles.tripStatValue,
                  {
                    color: tripPlan.canComplete
                      ? Colors.primary
                      : Colors.warning,
                  },
                ]}
              >
                {tripPlan.canComplete
                  ? 'OK'
                  : `${tripPlan.chargingStops.length}`}
              </Text>
              <Text style={styles.tripStatLabel}>
                {tripPlan.canComplete ? 'Battery' : 'Stops'}
              </Text>
            </View>
          </View>

          {tripPlan.canComplete && (
            <View style={styles.successBox}>
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={Colors.primary}
              />
              <Text style={styles.successText}>
                Your battery is sufficient for this trip
              </Text>
            </View>
          )}

          {!tripPlan.canComplete && tripPlan.chargingStops.length > 0 && (
            <ScrollView
              style={styles.stopsScroll}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.stopsTitle}>Recommended Stops</Text>
              {tripPlan.chargingStops.map((stop, i) => (
                <View key={i} style={styles.stopItem}>
                  <View style={styles.stopTimeline}>
                    <View style={styles.stopDot} />
                    {i < tripPlan.chargingStops.length - 1 && (
                      <View style={styles.stopLine} />
                    )}
                  </View>
                  <View style={styles.stopContent}>
                    <Text style={styles.stopName} numberOfLines={1}>
                      {stop.station.name}
                    </Text>
                    <Text style={styles.stopDetail}>
                      {formatDistance(stop.distanceFromStart)} from start ·{' '}
                      {stop.chargingTimeMinutes} min charge + {stop.waitTimeMinutes} min wait
                    </Text>
                    <Text style={styles.stopSoc}>
                      Arrive {stop.socOnArrival}% → Leave{' '}
                      {stop.socAfterCharging}%
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          {!tripPlan.canComplete && tripPlan.chargingStops.length === 0 && (
            <View style={styles.warningBox}>
              <Ionicons name="warning" size={18} color={Colors.danger} />
              <Text style={styles.warningText}>
                No charging stations found along this route. Battery may not
                be sufficient for the trip.
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.text,
  },
  resultsContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    marginTop: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  resultItemPressed: {
    backgroundColor: Colors.surfaceElevated,
  },
  resultText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.text,
    lineHeight: 20,
  },
  errorBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerMuted,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    zIndex: 10,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: Colors.danger,
  },
  myLocationBtn: {
    position: 'absolute',
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 5,
  },
  rangeBadge: {
    position: 'absolute',
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    zIndex: 5,
  },
  rangeBadgeText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  loadingCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  loadingText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: Colors.text,
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderTopWidth: 1,
    borderColor: Colors.border,
    zIndex: 10,
  },
  panelHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 14,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  panelTitle: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    color: Colors.text,
    flex: 1,
    marginRight: 12,
  },
  stationTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  typeText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  distanceText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: Colors.textSecondary,
  },
  addressText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.textMuted,
    lineHeight: 18,
  },
  tripPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '45%',
    borderTopWidth: 1,
    borderColor: Colors.border,
    zIndex: 10,
  },
  tripStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  tripStat: {
    alignItems: 'center',
    gap: 3,
  },
  tripStatValue: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: Colors.text,
  },
  tripStatLabel: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: Colors.textMuted,
  },
  tripStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primaryMuted,
    borderRadius: 10,
    padding: 12,
  },
  successText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: Colors.primary,
    flex: 1,
  },
  stopsScroll: {
    maxHeight: 140,
  },
  stopsTitle: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  stopItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 6,
  },
  stopTimeline: {
    alignItems: 'center',
    width: 20,
  },
  stopDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.warning,
  },
  stopLine: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.border,
    marginTop: 4,
  },
  stopContent: {
    flex: 1,
    paddingBottom: 10,
  },
  stopName: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
  },
  stopDetail: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  stopSoc: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: Colors.warning,
    marginTop: 2,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.dangerMuted,
    borderRadius: 10,
    padding: 12,
  },
  warningText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: Colors.danger,
    flex: 1,
    lineHeight: 18,
  },
});
