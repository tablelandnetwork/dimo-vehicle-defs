// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.10 <0.9.0;

import {ERC721A, IERC721A} from "erc721a/contracts/ERC721A.sol";
import {ERC721AQueryable} from "erc721a/contracts/extensions/ERC721AQueryable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {TablelandDeployments} from "@tableland/evm/contracts/utils/TablelandDeployments.sol";
import {TablelandController, TablelandPolicy} from "@tableland/evm/contracts/TablelandController.sol";
import {SQLHelpers} from "@tableland/evm/contracts/utils/SQLHelpers.sol";
import {DynamicMerkleTree} from "./libs/DynamicMerkleTree.sol";

/// @title A demo implementation of DIMO VehicleId that stores vehicle defs in a Tableland table.
/// This version of VehicleId tracks a root hash representing a Tableland vehicle defs table,
/// which is used to verify an inclusion proof that a vehicle def exists when associating it with a new vehicle id.
contract VehicleId2 is ERC721A, ERC721AQueryable, AccessControl {
    /// @dev Role that can add new vehicle defs.
    bytes32 public constant VEHICLE_ADMIN_ROLE =
        keccak256("VEHICLE_ADMIN_ROLE");
    /// @dev Row count of vehicle defs.
    uint256 public numDefs;
    /// @dev Root hash of vehicle defs table
    bytes32 public defsRoot;

    /// @dev Tableland table id.
    uint256 private _defsTableId;
    /// @dev Tableland table prefix.
    string private constant DEFS_PREFIX = "dimo_vehicle_defs";
    /// @dev Tableland table schema.
    string private constant DEFS_SCHEMA =
        "id integer primary key, device_type_id text, make text, make_token_id integer, oem_platform_name text, model text, year integer, metadata text, model_style text, model_sub_style text";

    /// @dev A mapping of vehicle ids to vehicle defs (Tableland table row hashes)
    mapping(uint256 => bytes32) private _idDefs;
    /// @dev A URI used to reference off-chain table metadata.
    string private _baseURIString;

    /// @dev Event emitted when a new vehicle def is created.
    /// `id` is a unique hash of the vehicle def's table row id and its params from `VehicleDef`
    event VehicleDefCreated(bytes32 id);

    /// @dev Event emitted when a new vehicle id is created.
    /// `id` is the vehicle id (token id)
    /// `defId` is the vehicle def id (a unique hash)
    event VehicleIdCreated(uint256 id, bytes32 defId);

    /// @dev Struct representing a vehicle def.
    struct VehicleDef {
        string deviceTypeId;
        string make;
        uint256 makeTokenId;
        string oemPlatformName;
        string model;
        uint256 year;
        string metadata;
        string modelStyle;
        string modelSubStyle;
    }

    constructor(string memory baseURI) ERC721A("VehicleId", "VID") {
        // Create a Tableland table owned by this contract to hold vehicle defs
        _defsTableId = TablelandDeployments.get().create(
            address(this),
            SQLHelpers.toCreateFromSchema(DEFS_SCHEMA, DEFS_PREFIX)
        );

        _grantRole(DEFAULT_ADMIN_ROLE, _msgSenderERC721A());
        _grantRole(VEHICLE_ADMIN_ROLE, _msgSenderERC721A());
        _baseURIString = baseURI;
    }

    /// @dev Returns the Tableland table where vehicle defs are written.
    function getVehicleDefsTable() external view returns (string memory) {
        return SQLHelpers.toNameFromId(DEFS_PREFIX, _defsTableId);
    }

    /// @dev Create a new vehicle def.
    /// `def` is an instance of `VehicleDef`
    /// `proof` is a merkle append proof needed to update the on-chain root hash representing the Tableland vehicle defs table
    function createVehicleDef(
        VehicleDef memory def,
        bytes32[] memory proof
    ) external returns (uint256) {
        require(
            hasRole(VEHICLE_ADMIN_ROLE, _msgSenderERC721A()),
            "unauthorized"
        );

        // Create the new vehicle def's id
        bytes32 defId = keccak256(
            abi.encodePacked(
                numDefs + 1,
                def.deviceTypeId,
                def.make,
                def.makeTokenId,
                def.oemPlatformName,
                def.model,
                def.year,
                def.metadata,
                def.modelStyle,
                def.modelSubStyle
            )
        );

        /// Update the on-chain root hash representing the Tableland vehicle defs table
        /// This will throw if the proof is invalid
        defsRoot = DynamicMerkleTree.append(numDefs, defsRoot, defId, proof);

        // Insert the new vehicle def into the Tableland table
        string memory vals = string.concat(
            SQLHelpers.quote(def.deviceTypeId),
            ",",
            SQLHelpers.quote(def.make),
            ",",
            Strings.toString(def.makeTokenId),
            ",",
            SQLHelpers.quote(def.oemPlatformName),
            ",",
            SQLHelpers.quote(def.model),
            ",",
            Strings.toString(def.year),
            ",",
            SQLHelpers.quote(def.metadata),
            ",",
            SQLHelpers.quote(def.modelStyle),
            ",",
            SQLHelpers.quote(def.modelSubStyle)
        );
        string memory stmt = SQLHelpers.toInsert(
            DEFS_PREFIX,
            _defsTableId,
            "device_type_id,make,make_token_id,oem_platform_name,model,year,metadata,model_style,model_sub_style",
            vals
        );
        TablelandDeployments.get().mutate(address(this), _defsTableId, stmt);

        numDefs += 1;
        emit VehicleDefCreated(defId);
        return numDefs;
    }

    /// @dev Mints a new vehicle id.
    /// `defRowId` is the Tableland vehicle defs table row id to be associated with the new vehicle id
    /// `defId` is the vehicle def id (a unique hash) to be associated with the new vehicle id
    /// `proof` is a merkle inclusion proof that `defId` exists in the Tableland vehicle defs table
    function createVehicleId(
        uint256 defRowId,
        bytes32 defId,
        bytes32[] memory proof
    ) external payable returns (uint256 vehicleId) {
        // Verify inclusion proof
        require(
            DynamicMerkleTree.verify(
                defRowId - 1,
                numDefs,
                defsRoot,
                defId,
                proof
            ),
            "vehicle def does not exist"
        );

        // Mint new vehicle id
        vehicleId = _nextTokenId();
        _safeMint(_msgSenderERC721A(), 1);

        // Associate vehicle id with its vehicle def
        _idDefs[vehicleId] = defId;

        emit VehicleIdCreated(vehicleId, defId);
    }

    /// @dev Returns the vehicle def id for the given vehicle id.
    function getVehicleDefId(
        uint256 vehicleId
    ) external view returns (bytes32) {
        require(_exists(vehicleId), "vehicleId does not exist");

        return _idDefs[vehicleId];
    }

    /// @dev Updates base URI used for vehicle ids.
    function setBaseURI(string memory baseURI) external {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSenderERC721A()),
            "unauthorized"
        );
        _baseURIString = baseURI;
    }

    /// @inheritdoc ERC721A
    function _baseURI() internal view override returns (string memory) {
        return _baseURIString;
    }

    /// @inheritdoc ERC721A
    function _startTokenId() internal pure override returns (uint256) {
        return 1;
    }

    /// @inheritdoc IERC721A
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721A, IERC721A, AccessControl) returns (bool) {
        return
            ERC721A.supportsInterface(interfaceId) ||
            AccessControl.supportsInterface(interfaceId);
    }
}
