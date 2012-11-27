<?php
  session_start();

  function save_to_file($data_url) {
    //$image = base64_decode( str_replace('data:image/jpeg;base64,', '', $data_url);
    
    $filename = date('Ymt-mis');
    $fp = fopen('upload/'.$filename, 'w');
    fwrite($fp, $data_url);
    fclose($fp);
    
    return $filename;
  }

  $dataurl = addslashes($_POST['dataurl']);
  $get_ID ="bad";
  if($dataurl == ""){
    echo $get_ID;
    exit();
  }
  
  include ('sql/dbconfig.php');
  $sid = session_id();
  $filename = save_to_file($dataurl) ;
  $insert_sql='INSERT INTO `imagedata` (dataurl, sid) values ("'.$filename.'", "'.$sid.'")';
  
  mysql_query($insert_sql)or die('Error, insert failed--'.($insert_sql));
  $get_ID = mysql_insert_id();
  
  $handle = fopen('upload/'.$filename, 'r');
  $contents = fread($handle, filesize('upload/'.$filename));
  fclose($handle);
  echo $contents;
  //echo $get_ID;
  
?>