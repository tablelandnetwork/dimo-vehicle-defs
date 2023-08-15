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

contract VehicleId2 is ERC721A, ERC721AQueryable, AccessControl {
    // Role that can add new vehicle defs.
    bytes32 public constant VEHICLE_ADMIN_ROLE =
        keccak256("VEHICLE_ADMIN_ROLE");
    // Row count of vehicle defs.
    uint256 public numDefs;
    // Root hash of vehicle defs table
    bytes32 public defsRoot;

    // Tableland table id.
    uint256 private _defsTableId;
    // Tableland table prefix.
    string private constant DEFS_PREFIX = "dimo_vehicle_defs";
    // Tableland table schema.
    string private constant DEFS_SCHEMA =
        "id integer primary key, device_type_id text, make text, make_token_id integer, oem_platform_name text, model text, year integer, metadata text, model_style text, model_sub_style text";

    // A mapping of vehicle ids to vehicle defs (hash of the table row)
    mapping(uint256 => bytes32) private _idDefs;
    // A URI used to reference off-chain table metadata.
    string private _baseURIString;

    struct Vehicle {
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
        _defsTableId = TablelandDeployments.get().create(
            address(this),
            SQLHelpers.toCreateFromSchema(DEFS_SCHEMA, DEFS_PREFIX)
        );

        _grantRole(DEFAULT_ADMIN_ROLE, _msgSenderERC721A());
        _grantRole(VEHICLE_ADMIN_ROLE, _msgSenderERC721A());

        _baseURIString = baseURI;
    }

    event VehicleDefCreated(bytes32 id);

    function createVehicleDef(
        Vehicle memory vehicle,
        bytes32[] memory proof
    ) external returns (uint256) {
        require(
            hasRole(VEHICLE_ADMIN_ROLE, _msgSenderERC721A()),
            "unauthorized"
        );

        bytes32 defId = keccak256(
            abi.encodePacked(
                numDefs + 1,
                vehicle.deviceTypeId,
                vehicle.make,
                vehicle.makeTokenId,
                vehicle.oemPlatformName,
                vehicle.model,
                vehicle.year,
                vehicle.metadata,
                vehicle.modelStyle,
                vehicle.modelSubStyle
            )
        );
        defsRoot = DynamicMerkleTree.append(numDefs, defsRoot, defId, proof);
        numDefs += 1;

        string memory vals = string.concat(
            SQLHelpers.quote(vehicle.deviceTypeId),
            ",",
            SQLHelpers.quote(vehicle.make),
            ",",
            Strings.toString(vehicle.makeTokenId),
            ",",
            SQLHelpers.quote(vehicle.oemPlatformName),
            ",",
            SQLHelpers.quote(vehicle.model),
            ",",
            Strings.toString(vehicle.year),
            ",",
            SQLHelpers.quote(vehicle.metadata),
            ",",
            SQLHelpers.quote(vehicle.modelStyle),
            ",",
            SQLHelpers.quote(vehicle.modelSubStyle)
        );
        string memory stmt = SQLHelpers.toInsert(
            DEFS_PREFIX,
            _defsTableId,
            "device_type_id,make,make_token_id,oem_platform_name,model,year,metadata,model_style,model_sub_style",
            vals
        );
        TablelandDeployments.get().mutate(address(this), _defsTableId, stmt);

        emit VehicleDefCreated(defId);

        return numDefs;
    }

    function getVehicleDefsTable() external view returns (string memory) {
        return SQLHelpers.toNameFromId(DEFS_PREFIX, _defsTableId);
    }

    event VehicleIdCreated(uint256 id, bytes32 defId);

    function createVehicleId(
        uint256 rowId,
        bytes32 defId,
        bytes32[] memory proof
    ) external payable returns (uint256 vehicleId) {
        require(
            DynamicMerkleTree.verify(
                rowId - 1,
                numDefs,
                defsRoot,
                defId,
                proof
            ),
            "vehicle def does not exist"
        );

        vehicleId = _nextTokenId();
        _safeMint(_msgSenderERC721A(), 1);

        _idDefs[vehicleId] = defId;

        emit VehicleIdCreated(vehicleId, defId);
    }

    function getVehicleDefId(
        uint256 vehicleId
    ) external view returns (bytes32) {
        require(_exists(vehicleId), "vehicleId does not exist");

        return _idDefs[vehicleId];
    }

    function setBaseURI(string memory baseURI) external {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSenderERC721A()),
            "unauthorized"
        );
        _baseURIString = baseURI;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseURIString;
    }

    function _startTokenId() internal pure override returns (uint256) {
        return 1;
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721A, IERC721A, AccessControl) returns (bool) {
        return
            ERC721A.supportsInterface(interfaceId) ||
            AccessControl.supportsInterface(interfaceId);
    }
}
