# Quick Test Guide

## Quick Start Test

### Step 1: Prepare Environment
1. Make sure you have API keys in `.env` file
2. Start the server: `npm run dev`
3. Open http://localhost:3000

### Step 2: Test with Sample Data

**Option A: Use the provided test-case.json**
1. Upload `test-case.json` as the environment
2. Use this prompt:
   ```
   Move all high-priority items from Receiving Zone A to Shipping Zone C. Handle fragile items carefully and avoid obstacles.
   ```

**Option B: Simple Test**
1. Create a simple environment JSON:
   ```json
   {
     "warehouse": {
       "target": {"x": 50, "y": 50}
     },
     "robots": {
       "navigation": {"position": {"x": 0, "y": 0}},
       "manipulation": {"position": {"x": 5, "y": 0}},
       "sensing": {"position": {"x": 2, "y": 0}},
       "communication": {"position": {"x": 1, "y": 0}}
     }
   }
   ```
2. Use this prompt:
   ```
   Navigate to the target location and report status.
   ```

### Step 3: Verify
- All 4 robots should show tasks
- Tasks should be specific to each robot's role
- No errors should appear

## Example Prompts for Testing

### Navigation Focus
```
Plan and execute a path from position (0,0) to position (100,80) avoiding all obstacles.
```

### Manipulation Focus
```
Pick up the item at location (10,10) and place it at location (90,70) carefully.
```

### Sensing Focus
```
Scan the entire warehouse area and report all detected objects and environmental conditions.
```

### Communication Focus
```
Coordinate all robots to work together on a synchronized task and provide real-time status updates.
```

### Complex Multi-Robot Task
```
Move 5 boxes from Zone A to Zone B, monitor temperature throughout, avoid obstacles, and keep all robots synchronized.
```
