std::list<int> Astar::getPath(int origin, int destination)
{
	std::list<int> path;
	if (roadList[origin].isInList == -2)
	{
		cout << "getPath wrong : 出发点的边未被初始化";
		return path;
	}
	if (roadList[destination].isInList == -2)
	{
		cout << "getPath wrong : 目的地的边未被初始化";
		return path;
	}
	cout << "使用A*算法寻找从 " << origin << " 到 " << destination << "的最短路" << endl;
	cout << "已经初始化的边有: ";
	for (int i = 0; i < size; i++) {
		if (roadList[i].isInList == 0)cout << i << " ";
	}
	cout << endl;

	if (origin == destination)
	{
		path.push_back(destination);
		return path;
	}

	road* result = findPath(origin, destination);
	int temp = result->father;
	path.push_back(destination);
	path.push_front(temp);
	while (temp != origin)
	{
		temp = roadList[temp].father;
		path.push_front(temp);
	}
	if (!openList.empty())openList.pop();
	return path;
}