Design a clean, minimal, non-generic desktop web application UI for an AI-powered city-wide vehicle tracking system called:

“UrbanTrace”

Subtitle:
“Multi-Camera ANPR & Vehicle Trajectory Tracking”

This is a Smart India Hackathon prototype based on:
“City-Wide AI Engine for Multi-Camera ANPR Trajectory Tracking and Urban Traffic Analytics.”

IMPORTANT DESIGN RESTRICTIONS:

The interface must be SIMPLE.

Do NOT make it look like a generic SaaS dashboard.
Do NOT fill the screen with cards, charts, widgets, statistics, gradients, or unnecessary controls.
Do NOT add features that are not described below.
Do NOT create pages for settings, users, reports, billing, administration, notifications, etc.
Do NOT make every section visually compete for attention.

The main purpose of this application is:

1. Detect vehicles from camera feeds
2. Read license plates using OCR
3. Track vehicles within camera feeds
4. Combine observations from multiple cameras
5. Reconstruct the vehicle's route across the city
6. Visualize the trajectory on a map
7. Show basic traffic movement analytics

The TRAJECTORY RECONSTRUCTION feature is the central feature of the entire product.

The UI should feel like a specialized traffic intelligence / GIS application rather than a generic analytics dashboard.

--------------------------------------------------
VISUAL STYLE
--------------------------------------------------

Use a dark, modern GIS-inspired interface.

Background:
Very dark charcoal / near-black.

Map:
Dark map with subtle roads and geographic details.

Use color sparingly:

- Neutral white/gray for normal UI
- Blue/cyan for vehicle trajectories and active elements
- Green for successful/healthy states
- Amber for warnings
- Red only for actual alerts or abnormal conditions

Avoid excessive gradients.

Avoid glowing neon effects everywhere.

Avoid glassmorphism.

Avoid huge rounded cards.

Avoid excessive shadows.

Use thin borders and subtle separation.

Typography should be clean, modern and highly readable.

Use generous spacing.

The interface should feel calm and technical.

Think:
“traffic control room + GIS map”
rather than
“startup SaaS dashboard”.

--------------------------------------------------
APPLICATION STRUCTURE
--------------------------------------------------

Use only these five main sections in the sidebar:

1. Dashboard
2. Live Cameras
3. Vehicle Search
4. Trajectory
5. Traffic Analytics

No other major navigation items.

Sidebar should be narrow and simple.

Show the UrbanTrace logo/name at the top.

Navigation should use small simple icons and text.

The currently selected section should have a subtle blue/cyan indicator.

Top bar should contain only:

- Current city/region
- Search vehicle / plate field
- Small system status indicator

Do not add unnecessary profile menus, notification centers, settings buttons, etc.

--------------------------------------------------
1. DASHBOARD
--------------------------------------------------

The dashboard should provide a very simple overview.

Do NOT create a wall of KPI cards.

At the top, show only three compact statistics:

Active Cameras
Vehicles Detected
Active Trajectories

Below that, make the CITY MAP the main element.

The map should occupy most of the page.

Show:

- Camera locations
- Major roads
- A few vehicle movement lines
- Small vehicle/camera markers

Use the map to immediately communicate that the system connects multiple cameras across a city.

On the right side of the map, show a very small “Recent Detections” panel.

Example:

KA01AB1234
Camera C01
10:05:21

KA05MN8271
Camera C03
10:06:48

KA03XY4512
Camera C02
10:07:13

Keep this panel compact.

The dashboard should feel like a starting point, not a page packed with analytics.

--------------------------------------------------
2. LIVE CAMERAS
--------------------------------------------------

This page should show the actual camera feeds.

Use a simple 2x2 camera grid.

Each camera tile contains:

- Camera video preview
- Camera ID
- Location/road name
- Online/offline indicator
- Number of vehicles currently detected

Example:

CAMERA C01
Tumkur Road Junction
● LIVE

Vehicles: 12

Inside the video feed, show simple bounding boxes around detected vehicles.

For selected vehicles, show:

Track ID
Plate number

Example:

Track 17
KA01AB1234

Do not add complicated controls.

Clicking a camera should open a simple larger camera view.

The camera detail view should show:

- Video
- Detected vehicles
- Plate number
- Track ID
- OCR confidence
- Timestamp

The purpose of this page is to demonstrate:

CAMERA → VEHICLE DETECTION → TRACK ID → NUMBER PLATE

--------------------------------------------------
3. VEHICLE SEARCH
--------------------------------------------------

This page should be extremely simple.

At the top:

“Search Vehicle”

Large search field:

Enter license plate number

Example:

KA01AB1234

Optional basic filters:

Date
Time range

Do not add dozens of filters.

After searching, show the vehicle's detected observations.

Example:

KA01AB1234

First Seen
10:05

Last Seen
10:25

Cameras
4

Distance
8.7 km

Then show a chronological observation list:

10:05:21
Camera C01
Track 17
OCR 96%

10:11:42
Camera C02
Track 08
OCR 94%

10:18:03
Camera C05
Track 21
OCR 97%

10:25:16
Camera C06
Track 04
OCR 95%

Important:

Clearly communicate that Track IDs can change between cameras.

For example:

C01 → Track 17
C02 → Track 08
C05 → Track 21

These are local camera tracking IDs.

The vehicle identity is maintained using the recognized license plate / global vehicle identity.

At the bottom provide one primary action:

“View Trajectory”

This takes the user to the trajectory page.

--------------------------------------------------
4. TRAJECTORY
--------------------------------------------------

THIS IS THE MOST IMPORTANT PAGE.

Make this page visually impressive but still minimal.

The map should occupy approximately 75–80% of the screen.

Do not surround the map with lots of cards.

The map should show:

- City roads
- Camera nodes
- Vehicle route
- Direction arrows
- Start point
- Intermediate camera observations
- End point

Example route:

C01 ───── C02 ───── C05 ───── C06

The route should be represented by a clear highlighted line.

Camera nodes should be visible along the route.

The selected vehicle should be visually distinct.

At the side or bottom of the map, have one compact trajectory information panel.

Example:

--------------------------------
KA01AB1234

Vehicle
Car

Journey
8.7 km

Duration
21 min

Average Speed
24 km/h

Cameras
4
--------------------------------

Below this, show a simple chronological timeline:

10:05
C01
Detected

↓

10:11
C02
Detected

↓

10:18
C05
Detected

↓

10:25
C06
Detected

The timeline should connect visually to the camera nodes on the map.

When a timeline observation is selected:

- Highlight the corresponding camera
- Center the map on that camera
- Show timestamp
- Show plate confidence
- Show local Track ID

Example:

Camera C02

10:11:42

Track ID: 08
Plate: KA01AB1234
OCR Confidence: 94%

Add a simple:

▶ Replay Journey

control.

Replay should allow the user to visually follow the vehicle's movement along the reconstructed route.

Use only:

Play
Pause
Restart
Timeline scrubber

Do not create a complicated media player.

The trajectory page should make the core project concept immediately understandable:

MULTIPLE CAMERAS
↓
VEHICLE OBSERVATIONS
↓
CHRONOLOGICAL ORDER
↓
ROUTE RECONSTRUCTION
↓
CITY MAP

--------------------------------------------------
5. TRAFFIC ANALYTICS
--------------------------------------------------

Keep this page simple.

The purpose is to demonstrate the macro-level traffic analytics generated from vehicle trajectories.

At the top, show only:

Traffic Density
Average Speed
Vehicles / Hour

Below that, use a large city map with a simple traffic-density heatmap.

Show areas with:

Low traffic
Medium traffic
High traffic

Use subtle color intensity.

Below or beside the map, show only a few simple visualizations:

Vehicles per Hour
Average Speed by Road

Route Density

Do not create many charts.

Include a simple “Vehicle Movement” visualization showing how vehicles move between camera locations.

Example:

C01 → C02
C02 → C05
C05 → C06

The page should communicate:

INDIVIDUAL VEHICLE TRAJECTORIES
→
AGGREGATED
→
CITY-WIDE TRAFFIC INSIGHTS

--------------------------------------------------
CORE DATA MODEL
--------------------------------------------------

Design the UI around these concepts only:

CAMERA

camera_id
location
latitude
longitude
status

VEHICLE

license_plate
global_vehicle_id
vehicle_type

OBSERVATION

camera_id
track_id
timestamp
license_plate
OCR confidence
latitude
longitude

TRAJECTORY

vehicle
camera sequence
timestamps
route
distance
duration
average speed

Do not introduce unnecessary entities.

--------------------------------------------------
IMPORTANT VISUAL CONCEPT
--------------------------------------------------

The UI must visually distinguish:

LOCAL TRACK ID

from

GLOBAL VEHICLE ID / LICENSE PLATE

Example:

Camera C01
Track ID: 17
Plate: KA01AB1234

Camera C02
Track ID: 08
Plate: KA01AB1234

Camera C05
Track ID: 21
Plate: KA01AB1234

This demonstrates that the tracking system does not simply assume that Track 17 and Track 08 are the same object.

Instead, observations are associated with the same vehicle identity through the ANPR / cross-camera trajectory system.

--------------------------------------------------
MAP DESIGN
--------------------------------------------------

The map is one of the most important visual elements.

Use a dark GIS-style map.

Roads should be subtle.

Camera locations should appear as small nodes.

Trajectory should be the strongest visual element.

Use directional arrows along the trajectory.

Example:

          C02
          ●
         /
        /
C01 ●────────────● C05
                  \
                   \
                    ● C06

The route should clearly communicate movement direction.

Avoid decorative map elements.

The map exists to communicate vehicle movement, not to look pretty.

--------------------------------------------------
COMPONENT STYLE
--------------------------------------------------

Keep reusable components extremely simple:

- Sidebar
- Topbar
- Search field
- Camera tile
- Vehicle observation
- Small statistic
- Map
- Camera marker
- Trajectory line
- Timeline
- Small information panel
- Button
- Status indicator
- Simple chart

Do not create dozens of UI components.

--------------------------------------------------
RESPONSIVE BEHAVIOR
--------------------------------------------------

Design primarily for a 1440px desktop screen because this is a control/dashboard application.

Make the layout responsive enough for smaller laptop screens.

The map should always remain the dominant visual element on the Trajectory page.

--------------------------------------------------
PROTOTYPE FLOW
--------------------------------------------------

Create the following clickable prototype flow:

Dashboard
↓
Vehicle Search
↓
Search: KA01AB1234
↓
Vehicle Observations
↓
View Trajectory
↓
Trajectory Reconstruction
↓
Click camera observation
↓
Map focuses on camera
↓
Replay Journey
↓
Traffic Analytics

Also allow:

Dashboard
↓
Live Cameras
↓
Camera C01
↓
Detected Vehicle
↓
Plate / Track ID

--------------------------------------------------
DESIGN GOAL
--------------------------------------------------

The final design should NOT look like a generic admin dashboard.

It should look like a focused technical prototype built specifically for:

CITY-WIDE MULTI-CAMERA VEHICLE TRAJECTORY RECONSTRUCTION.

The first thing someone should understand when seeing the interface is:

“A vehicle is detected by different cameras, its observations are connected, and its complete movement through the city is reconstructed on a map.”

Prioritize:

1. Vehicle trajectory
2. Multi-camera observations
3. GIS visualization
4. ANPR/OCR results
5. Traffic movement analytics

Everything else should stay out of the interface.

Keep the design minimal.

Keep the number of elements low.

Use whitespace.

Use large map areas.

Use information only when it helps explain the system.

Do not add features simply to make the product look bigger.

The result should feel like a real specialized prototype, not a template dashboard.