# README

## Abstract

exploration of position-based simulation of cloth

## 1. Algorithm

Reading the following 2 papers (1 and 2) helps to get to know how cloths are simulated.

### 1-1. Basic Model and Implementations

A comprehensive but a bit outdated explanation of simulation of cloths is found [here](docs/papers/position_based_dynamics.pdf), especially section 3 and 4 are good to grasp mathmatical expressions and implementations.

However, since many methods suggested above are not suitable for parallel computation on GPU and not sufficient for more complex cloths, we use other implementations as follows.

First, Mass spring model is adopted to simulate a cloth as stated at [this NVIDIA page](https://docs.nvidia.com/gameworks/content/gameworkslibrary/physx/guide/Manual/Cloth.html) and use a simplified bending forces because the implementation of NVIDIA looks real.

Second, instead of solving constraints separately, update all the positions in parallel by Newton's 2nd law after accumulating all the forces to all the points.

Finally, use signed distance function to handle collisions.
Read [this paper about SDF](docs/papers/local_optimization_for_robust_signed_distance_field_collision.pdf) to handle collisions much faster than the method suggested above.
Here is [a paper on detailed SDF theories and its applications](docs/papers/msanchez-sdf-thesis.pdf).
~~On the other hand, we resolve self collisions using [contour minimization](docs/papers/resolving_collision.pdf) to render complext cloths which consist of many parts like collars, plackets, and pockets.~~ We use AABB and BVH to detect self intersections.
Implementation is found [here](https://static1.squarespace.com/static/559921a3e4b02c1d7480f8f4/t/596773e9f7e0ab3d29bb102f/1499952110561/Mroz+Michael_746.pdf).

### 1-2. Further Reading

Many algorithms are based on papers published in from 2000 to 2008 or so, hence cutting-edge techniques should be explored in 2021 like [multigrid](docs/papers/parallel_multigrid_for_nonlinear_cloth_simulation.pdf).

### 1-3. Algorithm In This Project

- 1-3-1. add gravity to particles.

  (parrallel computation with GPU)

- 1-3-2. add spring forces to particles with mass spring model.

  (parrallel computation with GPU)

  but, bending forces are calculated in ratio of an angle of dihedral triangle meshes, which enables to represent the stand collar correctly.

  When sewing multiple patterns together, take in account of forces from particles connected to sewed particle too.

- 1-3-3. Self collisions are resolved by BVH of a cloth

  (parrallel computation with GPU)

  add repelling forces if particles are nearer than some small torelance only if they are not sewed together

  In order to reduce computation time, self collisions are to be only checked specific parts like collars ageinst shoulders.
  Hence, BVH are to be constructed for each patterns separately.

- 1-3-4. collision detection between a cloth and the body is handled with static prescribed signed distance fields. add forces to resolve collission.

  (parrallel computation with GPU)

  In animation, still signed distance fields are used as stated in McAdams et al. 2011 (c.f. [5.3 Soft body](docs/papers/local_optimization_for_robust_signed_distance_field_collision.pdf)). **SDF for deformable models combined with [DeepSDF](https://openaccess.thecvf.com/content_CVPR_2019/papers/Park_DeepSDF_Learning_Continuous_Signed_Distance_Functions_for_Shape_Representation_CVPR_2019_paper.pdf) might be great to explore in future.**

  - 1-3-4-1. SDF

    - use [NVIDIA's algorithm](https://developer.nvidia.com/gpugems/gpugems3/part-v-physics-simulation/chapter-34-signed-distance-fields-using-single-pass-gpu) to construct SDF. the algorithm may be different from the following methods (slower and thin grid)
    - or use [this algorithm](https://www.graphicon.ru/html/2003/Proceedings/Technical/paper495.pdf) to construct SDF. the algorithm may be different from the following methods (faster but thin grid, so use fast marging method to get dence grid very fast)
    - or use brute force (very slow but dense grid)

      - get 3d meshes (triangulate if necessary) and norms
      - define 3d space D that is AABB (cube that encloses all the triangles above)
      - loop for every (x,y,z) in D
      - for each (x,y,z) traverse all the tiangles and calculate the min distance to the nearest triangle. save the signed min distance and the norm (if inside -, else +)

        - signed distance d is givend by

          (u,v) = { (u,v) | argmin(u,v) ||barycentric_of_triangle_from_xyz(u,v)|| and u, v >= 0 and u+v <= 1 }

          - this problem can be solved (approximated) explicitly even with the constratins of u and v

            first, find the shortest path from a point to a triangle

            if a perpendicular vector from a point to a triangle is inside the trianlge, then the vector is the shortest path to the triangle.

            else, express a median on the triangle by barycentric coordinates, then update s and t with gradient discent only once, because nearest point must be on either edge of the triangle, we can detect the correct edge by comparing s and t and 1-s-t, of which the 2 vertices corresponding to the largest 2 params are the ones between which the nearest point is located.

            next, if a dot product of face_normal and shortest_path is positive,
            then sign is positive
            else sign is negative

            finally, signed distance = sign \* |shortest_path|

      - flat array for all (x,y,z) in D is the result (called singed distance fields or singed distance function that map (x,y,z) to signed distance of real numbers)
        ```
        /// SDF = f: R^3 -> R {d | d = argmin(min distance from a point(x,y,z) to all the triangles in a 3d model)}
        return: [d0, x0, y0, z0, d1, x1, y1, z1, ..., dn, xn, yn, zn]
        // d0 is signed distance and x0,y0,z0 is a norm in the direction to the nearest triangle
        ```

    - if signed distance fields are coarse for some points (x,y,z), then use nearest signed distance
    - resolve collisions by adding force of -d\*n

    - 1-3-4-2. Friction

      add frictions to particles if collisions detected to make sure that any cloth can rest on any human body, on the other hand, if tagging shoulder lines of patterns to shoulder lines of bodies, wide neck designs won't fit well.

- 1-3-5. update positions by Newton's second law.

  (parrallel computation with GPU)

  - x_new = x_current + v0 \* dt + 1/2 \* F/m \* dt^2
  - Then update v0 by v0 + a \* dt
  - And reset F by 0

- 1-3-6. sewing constraints are simulated by moveing two sewed particles to their median.

  (parrallel computation with GPU)

  - 1-3-6-1. sewing instuctions are stored in patttern files.

  - 1-3-6-2. when adding verties, store indices if it's to be sewed, and when the counter vertices are added, get the indices and save the pairs of sewing indices to array.

    (one time, update only if patterns are changed)

    save the origin and the end first and create internal pairs so that the length of the patterns are correct.

## Human Body Model

### [End-to-end Recovery of Human Shape and Pose](https://github.com/akanazawa/hmr)
