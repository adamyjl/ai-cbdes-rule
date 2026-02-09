#ifndef LOCALIZATION_MAP_ANALYSIS_H
#define LOCALIZATION_MAP_ANALYSIS_H

#include "dijkstraTopologyMap.h"
#include <string>

typedef struct { int dummy; } mapAnalysisPara;
typedef struct { std::string fileName; } mapAnalysisInput;
typedef struct { Map m; } mapAnalysisOutput;
void mapAnalysis(mapAnalysisPara& para, mapAnalysisInput& input, mapAnalysisOutput& output);

#endif
