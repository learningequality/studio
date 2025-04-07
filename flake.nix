{
  description = "A very basic flake";

  inputs = {
    nixpkgs.url = "nixpkgs/release-20.09";

    nixpkgsOld.url = "nixpkgs/release-19.09";
    # nixpkgsOld.flake = false;
  };

  outputs = { self, nixpkgs, nixpkgsOld }:
    let
      overlay = self: super: {
        # this overlay is to replace yarn's dep from the latest nodejs, to nodejs 16.
        yarn = with self;
          super.yarn.overrideAttrs (old: { buildInputs = [ nodejs-16_x ]; });
      };

    in {
      old = nixpkgsOld;
      devShell.x86_64-linux = let
        npkgsOld = import nixpkgsOld { system = "x86_64-linux"; };
        npkgs = import nixpkgs {
          system = "x86_64-linux";
          overlays = [ overlay ];

        };
        buildTimePkgs = with npkgs; [
          yarn
          nodejs-16_x
          python36
          python36Packages.venvShellHook
          python36Packages.wheel
          postgresql16 # for building psycopg2
        ];
        runTimePkgs = with npkgs; [ minio postgresql16 redis ];
        cloudPkgs = with npkgs; [
          google-cloud-sdk
          kubectl
          kubernetes-helm
        ];
        localCloudPkgs = with npkgs; [
          minikube
          jq
        ];
      in with npkgs;
      mkShell {
        venvDir = "./.venv";
        name = "studio-shell";
        src = self;
        buildInputs = buildTimePkgs ++ runTimePkgs ++ cloudPkgs ++ localCloudPkgs;

        LD_LIBRARY_PATH = "${stdenv.cc.cc.lib}/lib";
      };
    };
}
