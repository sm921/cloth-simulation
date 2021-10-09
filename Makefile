obj-name:
	npx obj2gltf -i $(name)
	
clean:
	rm -r dist

############## dev ##########
build:
	npx tsc -w -p configs/$(n).json
cloth:
	make build n=cloth
freefall:
	make build n=freefall
multigrid:
	make build n=multigrid
sdf:
	make build n=sdf
spring:
	make build n=spring

test:
	npx jest 
testbuild:
	npx tsc -w -p configs/test.json
	