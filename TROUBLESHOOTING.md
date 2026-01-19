# Troubleshooting Guide

## CORS Error Fix

If you see this error:
```
Access to fetch at 'https://api.anthropic.com/v1/messages' from origin 'http://localhost:3000' has been blocked by CORS policy
```

### Solution Steps:

1. **Clear Next.js Cache:**
   ```bash
   # Delete the .next folder
   rm -rf .next
   # Or on Windows PowerShell:
   Remove-Item -Recurse -Force .next
   ```

2. **Restart the Dev Server:**
   - Stop the current server (Ctrl+C)
   - Start it again:
     ```bash
     npm run dev
     ```

3. **Hard Refresh Browser:**
   - Windows/Linux: `Ctrl + Shift + R` or `Ctrl + F5`
   - Mac: `Cmd + Shift + R`

4. **Clear Browser Cache:**
   - Open DevTools (F12)
   - Right-click the refresh button
   - Select "Empty Cache and Hard Reload"

5. **Verify API Route:**
   - The component should call `/api/orchestrate` (not the Anthropic API directly)
   - Check the Network tab in DevTools to confirm the request goes to `/api/orchestrate`

## Common Issues

### Issue: "ANTHROPIC_API_KEY environment variable is not set"

**Solution:**
1. Create a `.env` file in the `warehouse-ai-system` directory
2. Add your API key:
   ```
   ANTHROPIC_API_KEY=your_key_here
   ```
3. Restart the dev server

### Issue: "Invalid JSON file"

**Solution:**
- Ensure your JSON file is valid JSON
- Use a JSON validator if needed
- Check for trailing commas or syntax errors

### Issue: Tasks not generating

**Solution:**
1. Check browser console for errors
2. Check server terminal for API errors
3. Verify your API key has credits/quota
4. Try a different LLM model

### Issue: Component not updating

**Solution:**
1. Clear `.next` cache
2. Restart dev server
3. Hard refresh browser

## Verification Checklist

- [ ] `.env` file exists with API keys
- [ ] Dev server is running on port 3000
- [ ] No errors in browser console
- [ ] No errors in server terminal
- [ ] Network tab shows requests to `/api/orchestrate` (not external APIs)
- [ ] Component code uses `/api/orchestrate` endpoint

## Still Having Issues?

1. Check the server terminal output for detailed error messages
2. Open browser DevTools → Network tab to see actual requests
3. Verify the API route is accessible: `http://localhost:3000/api/orchestrate` (should return 405 Method Not Allowed for GET, which is expected)
4. Ensure all dependencies are installed: `npm install`
