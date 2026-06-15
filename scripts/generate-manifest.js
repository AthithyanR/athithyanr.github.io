import fs from 'fs';
import path from 'path';
import exifr from 'exifr';

const TRAVEL_DIR = './public/travel';
const MANIFEST_FILE = './public/data/travel-manifest.json';
const TRIPS_DATA_DIR = './public/data/trips';
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

function getImageFiles(dirPath) {
  try {
    const files = fs.readdirSync(dirPath);
    return files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return IMAGE_EXTENSIONS.includes(ext);
    }).sort();
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error.message);
    return [];
  }
}

async function getImageMetadata(imagePath) {
  const filename = path.basename(imagePath);
  try {
    const exifData = await exifr.parse(imagePath, {
      tiff: true,
      xmp: true,
      icc: true,
      iptc: true,
      jfif: true,
      ihdr: true,
      exif: true,
      gps: true,
      interop: true,
      translateValues: true,
      translateTags: true,
      reviveValues: true
    });

    const metadata = {
      date: null,
      camera: null,
      lat: null,
      lng: null
    };

    if (exifData) {
      if (exifData.DateTimeOriginal) {
        metadata.date = exifData.DateTimeOriginal.toISOString();
      } else if (exifData.DateTime) {
        metadata.date = new Date(exifData.DateTime).toISOString();
      }

      if (exifData.Make && exifData.Model) {
        metadata.camera = `${exifData.Make} ${exifData.Model}`;
      } else if (exifData.Make) {
        metadata.camera = exifData.Make;
      } else if (exifData.Model) {
        metadata.camera = exifData.Model;
      }

      if (exifData.latitude && exifData.longitude) {
        metadata.lat = exifData.latitude;
        metadata.lng = exifData.longitude;
      }
    }

    if (!metadata.date) {
      const dateMatch = filename.match(/(\d{4})(\d{2})(\d{2})[_-]?(\d{2})(\d{2})(\d{2})/);
      if (dateMatch) {
        const [_, year, month, day, hour, min, sec] = dateMatch;
        const dateStr = `${year}-${month}-${day}T${hour}:${min}:${sec}Z`;
        try {
          metadata.date = new Date(dateStr).toISOString();
        } catch (e) {
          console.error(`Error parsing date from filename ${filename}:`, e.message);
        }
      }
    }

    return metadata;
  } catch (error) {
    console.error(`Error reading EXIF data from ${imagePath}:`, error.message);

    const metadata = { date: null, camera: null, lat: null, lng: null };
    const dateMatch = filename.match(/(\d{4})(\d{2})(\d{2})[_-]?(\d{2})(\d{2})(\d{2})/);
    if (dateMatch) {
      const [_, year, month, day, hour, min, sec] = dateMatch;
      const dateStr = `${year}-${month}-${day}T${hour}:${min}:${sec}Z`;
      try {
        metadata.date = new Date(dateStr).toISOString();
      } catch (e) {}
    }
    return metadata;
  }
}

function formatTripName(dirName) {
  const parts = dirName.split('-');
  if (parts.length < 3) return dirName;

  const year = parts[0];
  const month = parts[1];
  const location = parts.slice(2).join(' ');

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const monthName = monthNames[parseInt(month) - 1] || month;
  const locationFormatted = location.split(' ').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');

  return `${monthName} ${year}, ${locationFormatted}`;
}

async function main() {
  console.log('Generating travel manifest...');

  if (!fs.existsSync(TRAVEL_DIR)) {
    console.error(`Travel directory not found: ${TRAVEL_DIR}`);
    process.exit(1);
  }

  const tripDirs = fs.readdirSync(TRAVEL_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
    .sort();

  console.log(`Found ${tripDirs.length} trip directories`);

  const tripsSummary = [];

  if (!fs.existsSync(path.dirname(MANIFEST_FILE))) {
    fs.mkdirSync(path.dirname(MANIFEST_FILE), { recursive: true });
  }
  if (!fs.existsSync(TRIPS_DATA_DIR)) {
    fs.mkdirSync(TRIPS_DATA_DIR, { recursive: true });
  }

  for (const tripDir of tripDirs) {
    const tripPath = path.join(TRAVEL_DIR, tripDir);

    const jsonPath = path.join(tripPath, 'trip.json');
    let tripData = {
      title: formatTripName(tripDir),
      description: '',
      tags: []
    };

    if (fs.existsSync(jsonPath)) {
      try {
        const customData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        tripData = { ...tripData, ...customData };
        console.log(`Using trip.json for ${tripDir}`);
      } catch (error) {
        console.error(`Error parsing trip.json in ${tripDir}:`, error.message);
      }
    }

    const images = getImageFiles(tripPath);
    const photos = [];

    for (const imageName of images) {
      const imagePath = path.join(tripPath, imageName);
      const metadata = await getImageMetadata(imagePath);

      photos.push({
        url: `/travel/${tripDir}/${imageName}`,
        date: metadata.date,
        camera: metadata.camera,
        lat: metadata.lat,
        lng: metadata.lng
      });
    }

    const tripDetails = {
      ...tripData,
      photos: photos
    };
    fs.writeFileSync(
      path.join(TRIPS_DATA_DIR, `${tripDir}.json`),
      JSON.stringify(tripDetails, null, 2)
    );

    tripsSummary.push({
      id: tripDir,
      title: tripData.title,
      description: tripData.description,
      tags: tripData.tags,
      coverPhoto: photos[0]?.url || null,
      photoCount: photos.length
    });

    console.log(`Processed ${tripDir} (${photos.length} photos)`);
  }

  const manifest = {
    trips: tripsSummary,
    generatedAt: new Date().toISOString()
  };

  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
  console.log(`Manifest generated successfully at ${MANIFEST_FILE}`);
}

const __filename = new URL(import.meta.url).pathname;
const isMain = process.argv[1] && __filename.endsWith(process.argv[1]);

if (isMain) {
  main();
}

export { main };
