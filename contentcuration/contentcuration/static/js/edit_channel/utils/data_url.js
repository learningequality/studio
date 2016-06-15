function to_data_url(image, canvas){
	var ctx = canvas[0].getContext('2d');
	var width = image.width();
	var height = image.height();
	canvas.attr('width', width);
	canvas.attr('height', height);
	ctx.drawImage(image[0], 0, 0, width, height);
    return canvas[0].toDataURL("image/png");
}

module.exports = {
  to_data_url : to_data_url
}