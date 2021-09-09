obj-name:
	npx obj2gltf -i $(name)
	
	
build:
	npx tsc
	
clean:
	rm -r dist && rm tsconfig.tsbuildinfo	
	
dev:
	npx tsc -w

test:
	npm test