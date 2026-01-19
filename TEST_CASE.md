# Test Case for Robot Orchestration System

## Test Scenario: Warehouse Item Relocation

### Objective
Test the system's ability to generate specific tasks for each robot when given a complex warehouse operation request.

### Test Inputs

#### 1. User Prompt
```
Move all high-priority items from the Receiving Zone (Zone A) to the Shipping Zone (Zone C) as quickly as possible. Ensure fragile items are handled carefully, avoid all obstacles, and monitor environmental conditions throughout the operation. Coordinate all robots to work efficiently together.
```

#### 2. Environment JSON
Use the file: `test-case.json`

This JSON contains:
- Warehouse layout with 3 zones (Receiving, Storage, Shipping)
- 3 items in Receiving Zone (2 high-priority, 1 fragile)
- 2 obstacles in the path
- Current positions and status of all 4 robots
- Environmental conditions (temperature, humidity, lighting)

### Expected Behavior

When you submit this test case, the system should:

1. **Generate specific tasks** for each robot based on their capabilities
2. **Navigation Robot** should receive a task like:
   - "Plan optimal route from Receiving Zone A (10,10) to Shipping Zone C (90,70), avoiding obstacles at positions (30,25) and (60,50)"
   
3. **Manipulation Robot** should receive a task like:
   - "Carefully grasp and transport high-priority items (box-001, box-003) from Zone A to Zone C, with special attention to fragile box-003"
   
4. **Sensing Robot** should receive a task like:
   - "Monitor temperature (maintain 15-20°C), humidity levels, and detect any obstacles or hazards along the transport route"
   
5. **Communication Robot** should receive a task like:
   - "Coordinate movement timing between Navigation and Manipulation robots, report status updates, and ensure all robots are synchronized"

### How to Run the Test

1. **Start the development server:**
   ```bash
   cd warehouse-ai-system
   npm run dev
   ```

2. **Open the application:**
   - Navigate to http://localhost:3000

3. **Enter the test inputs:**
   - **Prompt:** Copy and paste the user prompt above
   - **Environment JSON:** Click "Upload Environment JSON" and select `test-case.json`
   - **Model:** Select any available model (e.g., "Claude Sonnet 4")

4. **Generate Tasks:**
   - Click "Generate Robot Tasks"
   - Wait for the LLM to process and generate tasks

5. **Verify Results:**
   - Check that all 4 robots received specific, actionable tasks
   - Verify tasks are relevant to each robot's capabilities
   - Confirm tasks address the user's requirements

### Additional Test Cases

#### Test Case 2: Simple Navigation
**Prompt:** "Navigate the Navigation Robot to position (50, 40) in the warehouse."

**Expected:** Navigation robot gets a clear navigation task, other robots may get minimal or monitoring tasks.

#### Test Case 3: Environmental Monitoring
**Prompt:** "Check the temperature and humidity levels throughout the warehouse and report any anomalies."

**Expected:** Sensing robot gets primary task, Communication robot gets reporting task.

#### Test Case 4: Multi-Item Handling
**Prompt:** "Move box-001 and box-002 from Zone A to Zone B storage area, ensuring proper placement."

**Expected:** Manipulation robot gets handling tasks, Navigation robot gets route planning, Sensing robot monitors, Communication robot coordinates.

### Validation Checklist

- [ ] All 4 robots receive tasks
- [ ] Tasks are specific and actionable
- [ ] Tasks match robot capabilities
- [ ] Tasks address the user prompt
- [ ] Tasks consider the environment data
- [ ] No errors in the console
- [ ] UI displays tasks correctly
- [ ] JSON response is valid

### Troubleshooting

If the test fails:

1. **Check API Keys:**
   - Ensure `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` is set in `.env`
   - Verify the API key is valid and has credits

2. **Check JSON Format:**
   - Ensure `test-case.json` is valid JSON
   - Verify no syntax errors

3. **Check Network:**
   - Ensure internet connection for LLM API calls
   - Check browser console for errors

4. **Check Model Availability:**
   - Some models may not be available in all regions
   - Try a different model if one fails

### Success Criteria

✅ Test passes if:
- System generates valid JSON response with tasks for all 4 robots
- Tasks are contextually appropriate
- No errors occur during processing
- UI displays results correctly
