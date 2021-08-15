# Note for Collistion Detection

## 1. Triangulate An Object

Using three.js, an object is automatically triangulated

## 2. Collision Detection Using BVH

Naively detecting collisions with AABB (axis aligned bounding box) between an object and clothes costs O(MN) complexity if the object consists of M primitives and the clothes consists of N vertices.

Using BVH, the complexity reduces to O(log(N) \* log(M)).

### 2-1. Construction

```
// define
    // all the primitives of an object (array of 3d vector)
    let primitives

    // all the positions of an cloth (array of 3d vector)
    let positions

    // all the previous positions of an cloth (array of 3d vector)
    let positions_prev

    // all the rays of movement of positions of an cloth (array of 3d vector)
    // here, - operator applies to positions elementwise
    let rays = positions - positions_prev

// main
    let object = new BVH(primitives)
    let cloth = new BVH(rays)

// implementation

    class BVH {
        // BVH
        left
        // BVH
        right
        // array of ints (indices for array of 3d vectors)
        values

        // values are inddices
        // vectors are references to data (i.e. primitives or rays which are dynamically updated per frame)
        BVH(values, vectors) {
            this.values = values
            if values.length > 1
                partition(this, values, vectors)
        }

        // partition using SAH (surface area heurystic)
        fn partition(bvh, values, vectors) {
            let cost = infinity
            let divide_at = Math.floor(values.length)
            let best_axis = x

            let values_left = empty
            let values_right = values

            // array of xy+yz+zx
            let areas_left = []

            for axis in [x,y,z] {

                values.sort(axis)

                // sweep from left

                let minx=null
                let miny=null
                let minz=null
                let maxx=null
                let maxy=null
                let maxz=null

                for i = 0 to values.length-1 {
                    let x = maxx-minx, y = maxy-miny, z = maxz-minz
                    areas_left[i] = xy+yz+zx
                    areas_left.push(areas.right.pop())
                    minx=min(minx, vectors[i].minx)
                    miny=min(miny, vectors[i].miny)
                    minz=min(minz, vectors[i].minz)
                    maxx=max(maxx, vectors[i].maxx)
                    maxy=max(maxy, vectors[i].maxy)
                    maxz=max(maxz, vectors[i].maxz)
                }

                // sweep from right

                    let minx=null
                    let miny=null
                    let minz=null
                    let maxx=null
                    let maxy=null
                    let maxz=null

                for i = 0 to values.length-1 {
                    let x = maxx-minx, y = maxy-miny, z = maxz-minz
                    areas_right = xy+yz+zx
                    areas_right.push(areas.right.pop())
                    minx=min(minx, vectors[i].minx)
                    miny=min(miny, vectors[i].miny)
                    minz=min(minz, vectors[i].minz)
                    maxx=max(maxx, vectors[i].maxx)
                    maxy=max(maxy, vectors[i].maxy)
                    maxz=max(maxz, vectors[i].maxz)

                    let new_cost = values_left.length * areas_right + values_right.length * areas_left[i]

                    if new_cost < cost
                        cost = new_cost
                        divide_at = i
                        best_axis = axis
            }


            if best_axis != z
                values.sort(best_axis)
            values_left = values[0..divide_at]
            values_right = values[divide_at..values.length-1]

            this.left = new BVH(values_left)
            this.right = new BVH(values_right)
        }

    }

```

### 2-2. Traverse Through BVH

```
// define

    // BVH of an object whose leaf corresponds to each primitive (triangle)
    let object

    // BVH of a cloth whose leaf corresponds to each vertex, wihch refers to a vector from the previous position to the current position
    let cloth


// main

    traverse_cloth(cloth)

// implementation

    fn traverse_cloth(cloth) {
        if cloth_node.left == null // is leaf
            traverse_object(object, cloth.values[0])
        else
            traverse_cloth(cloth.left)
            traverse_cloth(cloth.right)
    }

    fn traverse_object(object, cloth_ray) {
        if object.left == null // is leaf
            resolve_collision(object.values[0], cloth_ray)
        else
            traverse_object(cloth_ray, object.left)
            traverse_object(cloth_ray, object.right)
    }

    fn resolve_collision(ray, triangle) {
        // detailed in section 3
    }

```

## 3. Resolve Collisions with Ray-Triangle Intersection

### 3-1. Calculate the intersection with the plane

```
Let T be triangle with vertices of p0, p1, p2

Let o be a point from which a ray begins in the direction of a vector d

Any point on the triangle is represented by barycentric coordinates u, v like
    f(u, v) = (1-u-v)*p0 + u*p1 + v*p2

Hence, the intersection is given by solving the equation of t, u, and v
    o + t*d = (1-u-v)*p0 + u*p1 + v*p2
    that is
        Ax = b
        where
            A = [-d p1 p2] (3x3 matrix)
            x = (t u v)    (3d vector)
            b = o - p0     (3d vector)

If 0 <= t <= 1 then the ray intersects with the triangle
```

### 3-2. Check if the intersection is inside the triangle

```
Let i be the intersection calculated by the above process

Let n be the normal of the triangle
    n = (p1-p0) X (p2-p0)

If and only if the normal of (i-p0) and (p1-p0) is in the same direction with the n,
 i in inside the triangle.

That is, (i-p0) X (p1-p0) ・ n >= 0 (becaue the angle must be within from -PI/2 to PI/2)

Similarly, i must satisfy the following 2 conditions.
    (i-p1)X(p2-p1) ・ n  >= 0
    (i-p2)X(p0-p2) ・ n  >= 0

In conclusion, i must be satisfy the following 3 conditions.
    (i-p0) X (p1-p0) ・ n >= 0
    (i-p1) X (p2-p1) ・ n >= 0
    (i-p2) X (p0-p2) ・ n >= 0
    where
        n = (p1-p0)X(p2-p0)
        A X B denotes the outer product of vectors A and B
        A ・ B denotes the inner product of vectors A and B
```

### 3-3. Resolve collisions

```
If 0 < t < 1, then it's necessary to resolve the collision

Add the force to make use of parallel computing

 F = - (1-t)^2 * d/|d| * c
    where
        - c is constant, which must be found by try and errors for the positions to converge
        - (1-t)^2 converges to zero smoothly as t approaches to 1 (i.e. an intersection approaches to the surface)
```

## 4. Reference

- Frizzi San Roman Salazar et al, 2010, Cloth simulation using AABB hierarchies and GPU parallelism
- INGO WALD et al, 2006, Ray Tracing Deformable Scenes using Dynamic Bounding Volume Hierachies
- C. Lauterbach et al, 2009, Fast BVH Construction on GPUs
- R. Bridson et al, 2003, Simulation of Clothing with Folds and Wrinkles
