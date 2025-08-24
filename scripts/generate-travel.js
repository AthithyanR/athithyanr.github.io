const fs = require('fs');
const path = require('path');
const exifr = require('exifr');

const TRAVEL_DIR = './public/travel';
const TEMPLATE_FILE = './templates/travel_template.html';
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

        if (!exifData) {
            return {
                date: 'Unknown date',
                camera: 'Unknown camera',
                location: null,
                description: null
            };
        }

        const metadata = {
            date: 'Unknown date',
            camera: 'Unknown camera',
            location: null,
            description: null
        };

        if (exifData.DateTimeOriginal) {
            const date = new Date(exifData.DateTimeOriginal);
            metadata.date = date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } else if (exifData.DateTime) {
            const date = new Date(exifData.DateTime);
            metadata.date = date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        if (exifData.Make && exifData.Model) {
            metadata.camera = `${exifData.Make} ${exifData.Model}`;
        } else if (exifData.Make) {
            metadata.camera = exifData.Make;
        } else if (exifData.Model) {
            metadata.camera = exifData.Model;
        }

        if (exifData.latitude && exifData.longitude) {
            metadata.location = {
                lat: exifData.latitude,
                lng: exifData.longitude
            };
        }

        if (exifData.ImageDescription) {
            metadata.description = exifData.ImageDescription;
        } else if (exifData.UserComment) {
            metadata.description = exifData.UserComment;
        }

        return metadata;
    } catch (error) {
        console.error(`Error reading EXIF data from ${imagePath}:`, error.message);
        return {
            date: 'Unknown date',
            camera: 'Unknown camera',
            location: null,
            description: null
        };
    }
}

function formatTripName(dirName) {
    const parts = dirName.split('-');
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

async function generateTripSection(tripDir, tripName, images) {
    const imageElements = [];
    
    for (const imageName of images) {
        const imagePath = path.join(TRAVEL_DIR, tripDir, imageName);
        const metadata = await getImageMetadata(imagePath);
        
        const locationInfo = metadata.location 
            ? `<p class="location">📍 <a href="https://maps.google.com/?q=${metadata.location.lat},${metadata.location.lng}" target="_blank">View on Map</a></p>`
            : '';
            
        const descriptionInfo = metadata.description 
            ? `<p class="description">📝 ${metadata.description}</p>`
            : '';

        const imageElement = `
        <div class="image-container">
            <img src="/public/travel/${tripDir}/${imageName}" alt="${tripName} - ${imageName}" loading="lazy">
            <div class="image-info">
                <p class="date">📅 ${metadata.date}</p>
                <p class="camera">📷 ${metadata.camera}</p>
                ${locationInfo}
                ${descriptionInfo}
            </div>
        </div>`;
        
        imageElements.push(imageElement);
    }

    return `
    <section class="trip-section" id="${tripDir}">
        <div class="trip-header">
            <h2 class="trip-title">${tripName}</h2>
            <div class="trip-meta">
                <span class="trip-count">${images.length} photos</span>
            </div>
        </div>
        <div class="gallery">
            ${imageElements.join('')}
        </div>
    </section>`;
}

async function generateTravelPage(trips) {
    const tripSections = [];
    
    for (const trip of trips) {
        const section = await generateTripSection(trip.dir, trip.name, trip.images);
        tripSections.push(section);
    }

    const content = trips.length > 0 ? tripSections.join('') : '<div class="no-trips"><h2>No trips found</h2></div>';

    try {
        let template = fs.readFileSync(TEMPLATE_FILE, 'utf8');
        template = template.replace('<!-- PUT CONTENT HERE -->', content);
        return template;
    } catch (error) {
        console.error(`Error reading template file: ${error.message}`);
        return null;
    }
}

async function main() {
    console.log('🚀 Generating travel page...');

    if (!fs.existsSync(TRAVEL_DIR)) {
        console.error(`❌ Travel directory not found: ${TRAVEL_DIR}`);
        return;
    }

    if (!fs.existsSync(TEMPLATE_FILE)) {
        console.error(`❌ Template file not found: ${TEMPLATE_FILE}`);
        return;
    }

    const tripDirs = fs.readdirSync(TRAVEL_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)
        .sort();

    console.log(`📁 Found ${tripDirs.length} trip directories:`, tripDirs);

    const trips = [];

    tripDirs.forEach(tripDir => {
        const tripPath = path.join(TRAVEL_DIR, tripDir);
        const images = getImageFiles(tripPath);

        if (images.length > 0) {
            const tripName = formatTripName(tripDir);

            trips.push({
                dir: tripDir,
                name: tripName,
                images: images
            });

            console.log(`✅ Found ${images.length} images in ${tripDir}`);
        } else {
            console.log(`⚠️  No images found in ${tripDir}`);
        }
    });

    const travelHtml = await generateTravelPage(trips);

    if (travelHtml) {
        fs.writeFileSync('travel.html', travelHtml);
        console.log(`✅ Generated travel.html with ${trips.length} trip sections`);
        console.log('🎉 Travel page generated successfully!');
    } else {
        console.error('❌ Failed to generate travel page');
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    main
}