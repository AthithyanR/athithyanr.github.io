export default () => ({
  manifest: [],
  currentTripData: null,
  activeTrip: null,
  selectedPhoto: null,
  searchQuery: '',
  loading: true,
  error: null,
  async init() {
    try {
      const url = '/data/travel-manifest.json';
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      this.manifest = data.trips;
      this.loading = false;

      const hash = window.location.hash.slice(1);
      if (hash && this.manifest.some(t => t.id === hash)) {
        this.loadTrip(hash);
      }

      window.addEventListener('hashchange', () => {
        const h = window.location.hash.slice(1);
        if (h && h !== this.activeTrip) {
          this.loadTrip(h);
        } else if (!h) {
          this.activeTrip = null;
          this.currentTripData = null;
        }
      });
    } catch (error) {
      console.error('Failed to fetch manifest:', error);
      this.error = error.message;
      this.loading = false;
    }
  },
  async loadTrip(tripId) {
    this.activeTrip = tripId;
    this.currentTripData = null;
    try {
      const url = `/data/trips/${tripId}.json`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      this.currentTripData = await response.json();
      window.location.hash = tripId;
    } catch (error) {
      console.error('Failed to fetch trip data:', error);
      this.error = error.message;
    }
  },
  get filteredTrips() {
    if (!this.manifest || this.manifest.length === 0) return [];
    if (!this.searchQuery) return this.manifest;
    const query = this.searchQuery.toLowerCase();
    return this.manifest.filter(trip => {
      const title = trip.title ? trip.title.toLowerCase() : '';
      const description = trip.description ? trip.description.toLowerCase() : '';
      const tags = (trip.tags && Array.isArray(trip.tags)) ? trip.tags.map(t => t.toLowerCase()) : [];
      return title.includes(query) ||
             description.includes(query) ||
             tags.some(tag => tag.includes(query));
    });
  }
});
