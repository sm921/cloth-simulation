obj-name:
	npx obj2gltf -i $(name)
	
clean:
	rm -r dist

############## dev ##########
dev:
	make cloth \
	& make freefall \
	& make min \
	& make plot \
	& make sdf \
	& make spring \
	& make spring2 \
	& make string \
	& make testbuild
build:
	npx tsc -w -p configs/$(n).json
cloth:
	make build n=cloth
freefall:
	make build n=freefall
min:
	make build n=min
plot:
	make build n=plot
sdf:
	make build n=sdf
spring:
	make build n=spring
spring2:
	make build n=spring2
string:
	make build n=string

test:
	npx jest 
testbuild:
	npx tsc -w -p configs/test.json
	