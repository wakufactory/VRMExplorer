const VRM = function() {
	this.bsize = 0 
	this.meta = null
	this.buffers = []
	this.ctype = {
		5120:{type:"BYTE",size:1},
		5121:{type:"UBYTE",size:1},
		5122:{type:"SHORT",size:2},
		5123:{type:"USHORT",size:2},
		5125:{type:"UINT",size:4},
		5126:{type:"FLOAT",size:4}
	}
	this.dmode = {
		0:"POINTS",
		1:"LINES",
		2:"LINE_LOOP",
		3:"LINE_STRIP",
		4:"TRIANGLES",
		5:"TRIANGLE_STRIP",
		6:"TRIANGLE_FAN"
	}
	
}
VRM.prototype.parse = function(abuf){
	function u4(ofs) {return new DataView( buf.buffer,ofs,4).getUint32(0,true) }
	const buf = new Uint8Array(abuf)
	if(buf[0]!=0x67||buf[1]!=0x6c||buf[2]!=0x54||buf[3]!=0x46||buf[4]!=2) return null
	this.bsize = u4(8)
	console.log(this.bsize)  
	let ofs = 12
	const chunk = [] ;
	let bi = 0 
	while(ofs<this.bsize) {
		const csize = u4(ofs)
		let ctype = u4(ofs+4)
		if(ctype==1313821514) ctype="JSON"
		if(ctype==5130562) ctype="BIN"
		if(ctype=="JSON") {
			let js =Array.from(buf.slice(ofs+8,csize+ofs+8), e => String.fromCharCode(e)).join("")
			this.meta = JSON.parse(js)
			chunk.push({type:ctype,ofs:ofs,size:csize,data:this.meta})
		}
		if(ctype=="BIN") {
			this.buffers[bi] = buf.slice(ofs+8,csize+ofs+8)
			chunk.push({type:ctype,ofs:ofs,size:csize,data:this.buffers[bi]})
			bi++	
		}
		ofs += 8+csize 
	}
	this.chunk = chunk 
	console.log(chunk)
	return chunk 
}
VRM.prototype.getimg = function(){
	const imgs = [] 
	for(let im of this.meta.images) {
		const buf = this.meta.bufferViews[im.bufferView] 
		const data = this.buffers[buf.buffer].slice(buf.byteOffset,buf.byteOffset+buf.byteLength)
//		const uri = "data:"+im.mimeType+";base64,"+btoa(Array.from(data,e=>String.fromCharCode(e)).join(""))
		imgs.push(new Blob([data],{type:im.mimeType}))
	}
	return imgs 
}
VRM.prototype.getnode = function(ni){
	const n = this.meta.nodes[ni] 
	const nl = {node:ni,name:n.name,mesh:n.mesh,skin:n.skin}
	if(n.children) {
		nl.children = [] 
		for(let i=0;i<n.children.length;i++) {
			nl.children[i] = this.getnode(n.children[i])
		}
	}
	return nl 
}
VRM.prototype.getbuffer = function(ai){
	const ac = this.meta.accessors[ai] 
	const bv = this.meta.bufferViews[ac.bufferView]
	ac.data = this.buffers[bv.buffer].slice(bv.byteOffset,bv.byteOffset+bv.byteLength)
	ac.byteStride = bv.byteStride 
	ac.componentType = this.ctype[ac.componentType]
	switch(ac.componentType.type) {
		case "BYTE":
			ac.data = new Int8Array( ac.data.buffer )
			break 
		case "UBYTE":
			ac.data = new Uint8Array( ac.data.buffer )
			break
		case "SHORT":
			ac.data = new Int16Array( ac.data.buffer )
			break 
		case "USHORT":
			ac.data = new Uint16Array( ac.data.buffer )
			break ;s
		case "UINT":
			ac.data = new Uint32Array( ac.data.buffer )
			break ;
		case "FLOAT":
			ac.data = new Float32Array( ac.data.buffer )
			break ;
	}
	return ac
}