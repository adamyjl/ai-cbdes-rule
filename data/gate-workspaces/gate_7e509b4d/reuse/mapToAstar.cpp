void Astar::mapToAstar(Map m, Astar* as)
{
	for (auto it = m.roads.begin();it != m.roads.end(); it++)
	{
		int number = it->id;
		double xStart = it->lanes.begin()->gaussRoadPoints.begin()->GaussX;
		double yStart = it->lanes.begin()->gaussRoadPoints.begin()->GaussY;
		double xEnd = it->lanes.begin()->gaussRoadPoints.rbegin()->GaussX;
		double yEnd = it->lanes.begin()->gaussRoadPoints.rbegin()->GaussY;
		double length = sqrt((xStart - xEnd) * (xStart - xEnd) + (yStart - yEnd) * (yStart - yEnd));
		(*as).initRoad(number, xStart, yStart, xEnd, yEnd, length);
		for (auto itSuccessor = it->successorId.begin();itSuccessor != it->successorId.end();itSuccessor++)
		{
			(*as).initLink(number, *itSuccessor);
		}
	}
}