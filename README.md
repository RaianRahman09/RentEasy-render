# RentEasy

Rental platform with a React (Vite) frontend and Express/MongoDB backend. Follow the steps below to run it locally from GitHub.

## Prerequisites
- Node.js 18+ and npm
- MongoDB connection string
- (Optional) Cloudinary account for image uploads

## 1) Clone and install
```bash
git clone https://github.com/RaianRahman09/RentEasy.git
cd RentEasy

# install frontend deps
cd client
npm install

# install backend deps
cd ../server
npm install
```

## 2) Configure environment
Copy `server/.env.example` to `server/.env` and fill in the values:
```bash
cp server/.env.example server/.env
```
Key settings:
- `MONGO_URI` – your MongoDB connection string
- `JWT_SECRET`, `JWT_REFRESH_SECRET` – auth secrets
- `GOOGLE_CLIENT_ID` – OAuth client (Web) ID for Google login
- `CLOUDINARY_*` – Cloudinary creds (if using uploads)
- `CLIENT_URL` – typically `http://localhost:5173`
- `PORT` – backend port (default 5001)
- `NOMINATIM_BASE_URL` – optional override for OpenStreetMap geocoding
- `NOMINATIM_EMAIL` – optional contact email for Nominatim requests

Copy `client/.env.example` to `client/.env` and set:
- `VITE_API_BASE` – API base (defaults to `http://localhost:5001/api`)
- `VITE_GOOGLE_CLIENT_ID` – same OAuth client ID as above for Google buttons
- `VITE_NOMINATIM_BASE_URL` – optional override for frontend geocoding (defaults to public Nominatim)

## 3) Run the backend
```bash
cd server
npm run dev   # uses nodemon
# or: npm start
```
Backend defaults to `http://localhost:5001`.

## 4) Run the frontend
In a new terminal:
```bash
cd RentEasy/client
npm run dev
```
Frontend runs at `http://localhost:5173` (Vite dev server).

## 5) Verify
- Open the frontend URL in a browser.
- Backend should log “listening on PORT” with successful Mongo connection.

## Map + Geocoding (Learning Project)
- Uses OpenStreetMap tiles with Leaflet (`react-leaflet` + `leaflet`). No paid API keys required.
- Backend location search uses OpenStreetMap Nominatim geocoding (`/api/listings/search`).
- Landlord listing form uses Nominatim for address lookup and supports manual lat/lng input for offline testing.

## Common adjustments
- If ports conflict, update `server/.env` `PORT` and `client` API base URL (see `client/src/api/axios.js`).
- For production, build the frontend (`npm run build` in `client`) and deploy frontend/backend separately.
