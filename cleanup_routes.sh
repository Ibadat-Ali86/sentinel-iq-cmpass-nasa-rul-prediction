#!/bin/bash
# SentinelIQ — Fix Route Conflicts
# Run this script to remove (auth) group page stubs that conflict with flat routes.
# Usage: bash cleanup_routes.sh

FRONTEND="/media/ibadat/NewVolume/DATA SCIENCE/ML/DATASCIENCE PROJECTS/SentinalIQ_NASA_RUL-CMPASS_SYSTEM/sentinel-iq-cmpass-nasa-rul-prediction/frontend"

echo "🔧 Removing conflicting (auth) group page files..."

rm -f "${FRONTEND}/src/app/(auth)/dashboard/page.tsx" && echo "✓ Removed (auth)/dashboard/page.tsx"
rm -f "${FRONTEND}/src/app/(auth)/anomalies/page.tsx" && echo "✓ Removed (auth)/anomalies/page.tsx"
rm -f "${FRONTEND}/src/app/(auth)/shap/page.tsx" && echo "✓ Removed (auth)/shap/page.tsx"
rm -f "${FRONTEND}/src/app/(auth)/maintenance/page.tsx" && echo "✓ Removed (auth)/maintenance/page.tsx"
rm -f "${FRONTEND}/src/app/(auth)/health/page.tsx" && echo "✓ Removed (auth)/health/page.tsx"

# Also remove the (auth) route group directory stubs (optional - these are now empty)
# The layout.tsx stays so the group still applies to any future pages.

echo ""
echo "✅ Done! Now restart the dev server:"
echo "   cd \"${FRONTEND}\" && npm run dev"
echo ""
echo "📦 Also install Recharts if not done:"
echo "   npm install recharts --legacy-peer-deps"
