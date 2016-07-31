function to_data_url(image, canvas){
	var ctx = canvas[0].getContext('2d');
	var width = image.width();
	var height = image.height();
	canvas.attr('width', width);
	canvas.attr('height', height);
	ctx.drawImage(image[0], 0, 0, width, height);
    return canvas[0].toDataURL("image/png");
}

function get_browser(){
    var details=navigator.userAgent.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
    if(details.length < 3){
    	return null;
    }
    return {
      name: details[1],
      version: details[2]
    };
 }

 function get_max_parallel_uploads(){
 	var browser_details = get_browser();
 	switch(browser_details.name.toLowerCase()){
 		case "opera":
 			if(browser_details.version < 10) { return 4; }
 			else if(browser_details.version === 10) { return 8; }
 			else { return 6; }
 		case "chrome":
 			if(browser_details.version === 3) { return 4; }
 			else { return 6; }
 		case "safari":
 			if(browser_details.version >= 3 && browser_details <= 4) { return 4; }
 			else { return 2; }
 		case "firefox":
 			if(browser_details.version < 3) { return 2; }
 			else { return 6; }
 		case "msie":
 		case "trident":
 			if(browser_details.version < 8) { return 2; }
 			else if(browser_details.version < 10) { return 6; }
 			else { return 8; }
 		default:
 			return 1;
 	}
 }

module.exports = {
  to_data_url : to_data_url,
  get_browser:get_browser,
  get_max_parallel_uploads:get_max_parallel_uploads
}