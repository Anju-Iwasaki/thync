-- 1つの部屋でrunningのジョブは同時に1つまで。2つ目は23505で弾かれる
create unique index analysis_jobs_one_running_per_room
  on analysis_jobs (room_id)
  where status = 'running';