void speedModel(const SpeedModelParam &param, const SpeedModelInput &input, SpeedModelOutput &output){
  double distance = input.distance;
  double maxspeed = param.maxspeed;
  double minspeed = param.minspeed;
  double d1 = param.d1;
  double d2 = param.d2;

  if (distance < 0)
  {
    output.speed = minspeed;
    return;
  }

  if (distance < d2)
  {
    output.speed = minspeed;
    return;
  }
  else if (distance > d1)
  {
    output.speed = maxspeed;
    return;
  }
  else
  {
    output.speed = minspeed + (maxspeed - minspeed) * (distance - d2) / (d1 - d2);
    return;
  }
}