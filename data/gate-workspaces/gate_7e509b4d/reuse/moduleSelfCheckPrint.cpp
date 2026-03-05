void Map::moduleSelfCheckPrint() {
	std::cout << "地图共有" << roads.size() << "条路段" << std::endl;
	for (int i = 0; i < roads.size(); i++)
	{
		std::cout << "路段id：" << roads[i].id << std::endl;
		for (int j = 0; j < roads[i].successorId.size(); j++)
		{
			std::cout << "后继路段id：" << roads[i].successorId[j] << std::endl;
		}
		std::cout << "该路段有" << roads[i].lanes.size()<<"条车道" << std::endl;
		for (int j = 0; j < roads[i].lanes.size(); j++)
		{
			std::cout << "该路段第" << j << "条车道id:"<< roads[i].lanes[j].id << std::endl;
			for (int k = 0; k < roads[i].lanes[j].successorId.size(); k++)
			{
				std::cout << "该路段第" << j << "条车道后继车道:" << roads[i].lanes[j].successorId[k].sucRoadID<<"号路段，"<< roads[i].lanes[j].successorId[k].sucLaneID<<"号车道" << std::endl;
			}
			for (int k = 0; k < roads[i].lanes[j].leftLaneId.size(); k++)
			{
				std::cout << "该路段第" << j << "条车道左相邻车道id:" << roads[i].lanes[j].leftLaneId[k]  << std::endl;
			}
			for (int k = 0; k < roads[i].lanes[j].rightLaneId.size(); k++)
			{
				std::cout << "该路段第" << j << "条车道右相邻车道id:" << roads[i].lanes[j].rightLaneId[k] << std::endl;
			}
			std::cout << "该路段第" << j << "条车道路点数量:" << roads[i].lanes[j].gaussRoadPoints.size() << std::endl;
			//打印地图上所有路点的信息，路点可能比较多
			/*for (int k = 0; k < roads[i].lanes[j].gaussRoadPoints.size(); k++)
			{
				std::cout << "gaussX:" << roads[i].lanes[j].gaussRoadPoints[k].GaussX << ";";
				std::cout << "gaussY:" << roads[i].lanes[j].gaussRoadPoints[k].GaussY << ";";
				std::cout << "yaw:" << roads[i].lanes[j].gaussRoadPoints[k].yaw << ";";
				std::cout << "curvature::" << roads[i].lanes[j].gaussRoadPoints[k].curvature << std::endl;
			}*/
			
		}
	}
}