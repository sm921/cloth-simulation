obj-name:
	npx obj2gltf -i $(name)
	
clean:
	rm -r dist
	rm configs/*.tsbuildinfo

############## dev ##########
test:
	npx jest $(n)
testbuild:
	npx tsc -w -p configs/test.json
	
_webpack:
	npx webpack -w --config configs/$(n).js
cloth:
	make _webpack n=cloth
freefall:
	make _webpack n=free-fall
multigrid:
	make _webpack n=multigrid
sdf:
	make _webpack n=sdf
spring:
	make _webpack n=spring