void getDistance(const GetDistanceParam& param, const GetDistanceInput& input, GetDistanceOutput& output){
  double x1 = input.x1;
  double x2 = input.x2;
  double y1 = input.y1;
  double y2 = input.y2;

  output.distance = sqrt(pow(x1 - x2, 2) + pow(y1 - y2, 2));
}