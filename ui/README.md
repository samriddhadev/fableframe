# Storyline Studio 🎬

A modern React application for transforming stories into captivating videos. Create scenes, upload images, generate audio and video content, and merge everything into a final production.

## Features

- **Dynamic Scene Management**: Add and remove scene components on the fly
- **Rich Content Creation**: 
  - Text area for scene descriptions and dialogue
  - Image upload for visual content
  - Audio generation from text
  - Video creation from scenes
- **Preview & Review**: Modal-based video preview for each scene
- **Final Production**: Merge all scenes into a single MP4 video
- **Clean Interface**: Modern, responsive design with intuitive controls

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

## Usage

1. **Add Scenes**: Click "Add New Scene" to create scene components
2. **Enter Content**: Write your scene description or dialogue in the text area
3. **Upload Images**: Click the upload icon to add visual content
4. **Generate Audio**: Click the audio icon to create MP3 from text
5. **Create Video**: Click the video icon to generate MP4 for the scene
6. **Preview**: Use the play button to preview individual scenes
7. **Final Video**: Click "Generate Final Video" to merge all scenes
8. **Reset**: Use "Reset All" to start over

## Technology Stack

- **Frontend**: React 18 with JavaScript
- **Build Tool**: Vite
- **Icons**: Lucide React
- **Styling**: CSS3 with modern features

## Project Structure

```
src/
├── App.jsx          # Main application component
├── App.css          # Component styles
├── index.css        # Global styles and layout
└── main.jsx         # Application entry point
```

## Development

- Uses React hooks for state management
- Responsive design for mobile and desktop
- Modern CSS with Grid and Flexbox
- Component-based architecture
- File handling for image uploads
- Simulated audio/video generation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.
